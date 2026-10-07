// Edge Function: process-card-payment
// Processa pagamento do Checkout Transparente via Card Payment Brick.
//
// Secrets necessários em produção:
//   MERCADO_PAGO_ACCESS_TOKEN
// Opcionais:
//   MERCADO_PAGO_NOTIFICATION_URL
//   ALLOWED_ORIGINS
// Variáveis locais de teste:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true
//   LOCAL_DEV_MOCK_PAYMENTS=true
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "https://arquiteturadapausa.com",
  "https://www.arquiteturadapausa.com",
  "https://app.arquiteturadapausa.com",
]

const allowedOrigins = () =>
  (Deno.env.get("ALLOWED_ORIGINS") ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

const isAllowedOrigin = (req: Request) => {
  const origin = req.headers.get("Origin")
  return !origin || allowedOrigins().includes(origin)
}

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin")
  const allowOrigin = origin && allowedOrigins().includes(origin)
    ? origin
    : DEFAULT_ALLOWED_ORIGINS[0]

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  })

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

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? ""
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim()
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const allowLocalUnauthenticated = Deno.env.get("LOCAL_DEV_ALLOW_UNAUTHENTICATED") === "true"

  if (!jwt || (anonKey && jwt === anonKey)) {
    if (allowLocalUnauthenticated) {
      return {
        id: "00000000-0000-0000-0000-000000000000",
        email: "local-dev@arquiteturadapausa.test",
      }
    }
    return null
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!SUPABASE_URL || !SERVICE_KEY) {
    if (allowLocalUnauthenticated) {
      return {
        id: "00000000-0000-0000-0000-000000000000",
        email: "local-dev@arquiteturadapausa.test",
      }
    }
    throw new Error("Configuração Supabase ausente no servidor.")
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  })

  if (!response.ok) return null
  return response.json()
}

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

const getNotificationUrl = () => {
  const configured = Deno.env.get("MERCADO_PAGO_NOTIFICATION_URL")
  if (configured) return configured

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  return SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/mercado-pago-webhook` : null
}

const findOrder = async (orderId: string, userId: string) => {
  const response = await supabaseRest(
    `payment_orders?id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,user_email,status,external_reference,amount_cents,currency,plan_name,credits_purchased,quantity,provider_payment_id&limit=1`,
  )
  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`Falha ao buscar pedido: ${details.slice(0, 300)}`)
  }

  const orders = await response.json()
  return Array.isArray(orders) && orders.length ? orders[0] as Record<string, unknown> : null
}

const updateOrderFromPayment = async (order: Record<string, unknown>, payment: Record<string, unknown>) => {
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
      provider_payment_id: String(payment.id ?? ""),
      provider_status: paymentStatus || null,
      provider_status_detail: payment.status_detail ?? null,
      provider_payload: payment,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    }),
  })

  return normalizedStatus
}

const releaseCredits = async (order: Record<string, unknown>) => {
  const creditsPurchased = Math.max(1, Math.min(100, Number(order.credits_purchased ?? order.quantity ?? 1)))
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

  return creditsPurchased
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: isAllowedOrigin(req) ? 200 : 403, headers: corsHeaders(req) })
  }
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida." }, 403)
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405)

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(req, { error: "Usuário não autenticado." }, 401)

    const payload = await req.json().catch(() => ({}))
    const orderId = typeof payload.order_id === "string" ? payload.order_id.trim() : ""
    const paymentData = payload.payment_data && typeof payload.payment_data === "object"
      ? payload.payment_data as Record<string, unknown>
      : null

    if (!orderId) return json(req, { error: "Pedido ausente." }, 400)
    if (!paymentData) return json(req, { error: "Dados do pagamento ausentes." }, 400)

    const order = await findOrder(orderId, String((user as Record<string, unknown>).id))
    if (!order) return json(req, { error: "Pedido não encontrado." }, 404)
    if (order.status === "approved") {
      return json(req, { success: true, order_id: order.id, status: "approved", already_approved: true })
    }
    if (order.provider_payment_id && order.status !== "pending") {
      return json(req, { error: "Este pedido não pode ser pago novamente." }, 409)
    }

    const mockPayments = Deno.env.get("LOCAL_DEV_MOCK_PAYMENTS") === "true"
    if (mockPayments) {
      const mockPayment = {
        id: `local-${orderId}`,
        status: "approved",
        status_detail: "local_mock",
        date_approved: new Date().toISOString(),
        external_reference: order.external_reference,
      }
      const status = await updateOrderFromPayment(order, mockPayment)
      const creditsReleased = status === "approved" ? await releaseCredits(order) : 0
      return json(req, {
        success: true,
        local_mock: true,
        order_id: order.id,
        payment_id: mockPayment.id,
        status,
        credit_released: status === "approved",
        credits_released: creditsReleased,
      })
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
    if (!accessToken) return json(req, { error: "Configure MERCADO_PAGO_ACCESS_TOKEN no Supabase." }, 500)

    const amount = Number(((Number(order.amount_cents ?? 0) || 0) / 100).toFixed(2))
    if (!amount || amount <= 0) return json(req, { error: "Pedido sem valor válido." }, 500)

    const token = typeof paymentData.token === "string" ? paymentData.token : ""
    const paymentMethodId = typeof paymentData.payment_method_id === "string" ? paymentData.payment_method_id : ""
    const installments = Number(paymentData.installments ?? 1)
    if (!token || !paymentMethodId) return json(req, { error: "Token ou método de pagamento ausente." }, 400)

    const payerFromBrick = paymentData.payer && typeof paymentData.payer === "object"
      ? paymentData.payer as Record<string, unknown>
      : {}
    const identification = payerFromBrick.identification && typeof payerFromBrick.identification === "object"
      ? payerFromBrick.identification as Record<string, unknown>
      : undefined

    const mpPaymentBody: Record<string, unknown> = {
      token,
      transaction_amount: amount,
      installments: Number.isFinite(installments) && installments > 0 ? installments : 1,
      payment_method_id: paymentMethodId,
      issuer_id: paymentData.issuer_id ?? undefined,
      description: String(order.plan_name ?? "Plano Arquitetura da Pausa"),
      external_reference: order.external_reference,
      metadata: {
        order_id: order.id,
        user_id: order.user_id,
        credits_purchased: order.credits_purchased,
        product_type: "evaluation_credit",
      },
      payer: {
        email: String(order.user_email ?? (user as Record<string, unknown>).email ?? "").toLowerCase(),
        identification,
      },
    }

    const notificationUrl = getNotificationUrl()
    if (notificationUrl?.startsWith("https://")) mpPaymentBody.notification_url = notificationUrl

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": String(order.id),
      },
      body: JSON.stringify(mpPaymentBody),
    })

    const payment = await mpResponse.json().catch(() => ({}))
    if (!mpResponse.ok) {
      await supabaseRest(`payment_orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          provider_payload: payment,
          updated_at: new Date().toISOString(),
        }),
      })
      return json(req, { error: "Mercado Pago recusou o pagamento.", details: payment }, 502)
    }

    const status = await updateOrderFromPayment(order, payment as Record<string, unknown>)
    const creditsReleased = status === "approved" ? await releaseCredits(order) : 0

    return json(req, {
      success: true,
      order_id: order.id,
      payment_id: String((payment as Record<string, unknown>).id ?? ""),
      status,
      status_detail: (payment as Record<string, unknown>).status_detail ?? null,
      credit_released: status === "approved",
      credits_released: creditsReleased,
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : "Erro ao processar pagamento."
    return json(req, { error: message }, 500)
  }
})
