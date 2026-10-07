// Edge Function: mercado-pago-webhook
// Recebe notificações do Mercado Pago, valida assinatura quando configurada,
// consulta o pagamento na API oficial e libera os créditos do plano quando aprovado.
//
// Secrets necessários em produção:
//   MERCADO_PAGO_ACCESS_TOKEN
//   MERCADO_PAGO_WEBHOOK_SECRET
// Variáveis locais de teste:
//   LOCAL_DEV_ALLOW_UNSIGNED_MP_WEBHOOKS=true
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const supabaseRest = async (path: string, init: RequestInit = {}) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Configuração Supabase ausente no servidor.")

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

const parseSignature = (signature: string | null) => {
  const values: Record<string, string> = {}
  if (!signature) return values

  signature.split(",").forEach((part) => {
    const [key, ...rest] = part.split("=")
    if (key && rest.length) values[key.trim()] = rest.join("=").trim()
  })

  return values
}

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const hmacSha256 = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return toHex(signature)
}

const secureCompare = (left: string, right: string) => {
  if (left.length !== right.length) return false

  let result = 0
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return result === 0
}

const validateMercadoPagoSignature = async (req: Request, dataId: string) => {
  const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET")
  const allowUnsigned = Deno.env.get("LOCAL_DEV_ALLOW_UNSIGNED_MP_WEBHOOKS") === "true"
  if (!secret) return allowUnsigned

  const requestId = req.headers.get("x-request-id")
  const signatureHeader = req.headers.get("x-signature")
  const signature = parseSignature(signatureHeader)
  const ts = signature.ts
  const v1 = signature.v1

  if (!requestId || !ts || !v1) return false

  const signatureDataId = dataId.toLowerCase()
  const template = `id:${signatureDataId};request-id:${requestId};ts:${ts};`
  const expected = await hmacSha256(secret, template)
  return secureCompare(expected, v1)
}

const normalizeStatus = (status: string | null | undefined) => {
  if (status === "approved") return "approved"
  if (status === "rejected") return "rejected"
  if (status === "cancelled") return "cancelled"
  if (status === "refunded") return "refunded"
  if (status === "charged_back") return "charged_back"
  if (status === "expired") return "expired"
  if (status === "pending" || status === "in_process" || status === "authorized") return "pending"
  return "unknown"
}

const fetchPayment = async (paymentId: string) => {
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
  if (!accessToken) throw new Error("Configure MERCADO_PAGO_ACCESS_TOKEN no Supabase.")

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  const payment = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Falha ao consultar pagamento Mercado Pago: ${JSON.stringify(payment).slice(0, 300)}`)
  }
  return payment as Record<string, unknown>
}

const findOrder = async (externalReference: string) => {
  const response = await supabaseRest(
    `payment_orders?external_reference=eq.${encodeURIComponent(externalReference)}&select=id,user_id,quantity,status,credits_purchased`,
  )
  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`Falha ao buscar pedido: ${details.slice(0, 300)}`)
  }

  const orders = await response.json()
  return Array.isArray(orders) && orders.length ? orders[0] as Record<string, unknown> : null
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)

  try {
    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const dataId = String(
      url.searchParams.get("data.id") ??
        url.searchParams.get("data_id") ??
        body?.data?.id ??
        "",
    ).trim()
    const type = String(url.searchParams.get("type") ?? body?.type ?? "")

    if (type && type !== "payment") {
      return json({ success: true, ignored: true, reason: "Evento não é payment." })
    }
    if (!dataId) return json({ error: "data.id ausente." }, 400)

    const signatureOk = await validateMercadoPagoSignature(req, dataId)
    if (!signatureOk) return json({ error: "Assinatura Mercado Pago inválida." }, 401)

    const payment = await fetchPayment(dataId)
    const externalReference = String(payment.external_reference ?? "").trim()
    if (!externalReference) {
      return json({ success: true, ignored: true, reason: "Pagamento sem external_reference." })
    }

    const order = await findOrder(externalReference)
    if (!order) {
      return json({ success: true, ignored: true, reason: "Pedido não encontrado." })
    }

    const paymentStatus = String(payment.status ?? "")
    const normalizedStatus = normalizeStatus(paymentStatus)
    const paidAt = normalizedStatus === "approved"
      ? String(payment.date_approved ?? new Date().toISOString())
      : null

    await supabaseRest(`payment_orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: normalizedStatus,
        provider_payment_id: String(payment.id ?? dataId),
        provider_status: paymentStatus || null,
        provider_status_detail: payment.status_detail ?? null,
        provider_payload: payment,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      }),
    })

    const creditsPurchased = Math.max(1, Math.min(100, Number(order.credits_purchased ?? order.quantity ?? 1)))

    if (normalizedStatus === "approved") {
      const credits = Array.from({ length: creditsPurchased }, (_, index) => ({
        user_id: order.user_id,
        source_order_id: order.id,
        source_credit_index: index + 1,
        credit_type: "evaluation",
        status: "available",
      }))

      await supabaseRest("evaluation_credits?on_conflict=source_order_id,source_credit_index", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(credits),
      })
    }

    return json({
      success: true,
      order_id: order.id,
      payment_id: String(payment.id ?? dataId),
      status: normalizedStatus,
      credit_released: normalizedStatus === "approved",
      credits_released: normalizedStatus === "approved" ? creditsPurchased : 0,
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : "Erro ao processar webhook Mercado Pago."
    return json({ error: message }, 500)
  }
})
