// Edge Function: create-payment-preference
// Cria uma preferência Checkout Pro no Mercado Pago para compra de um plano.
//
// Secrets necessários em produção:
//   MERCADO_PAGO_ACCESS_TOKEN       -> access token privado do Mercado Pago
//   APP_BASE_URL                    -> URL pública do app, ex: https://arquiteturadapausa.com
// Opcionais:
//   MERCADO_PAGO_NOTIFICATION_URL   -> URL pública do webhook; default usa SUPABASE_URL/functions/v1/mercado-pago-webhook
//   ALLOWED_ORIGINS                 -> lista separada por vírgula
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

const getUserMetadata = (user: Record<string, unknown>) => {
  const userMetadata = user.user_metadata
  if (userMetadata && typeof userMetadata === "object") return userMetadata as Record<string, unknown>

  const rawMetadata = user.raw_user_meta_data
  if (rawMetadata && typeof rawMetadata === "object") return rawMetadata as Record<string, unknown>

  return {}
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
        user_metadata: { full_name: "Usuário Local de Teste" },
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
        user_metadata: { full_name: "Usuário Local de Teste" },
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

const fetchPlan = async (params: { planId?: string; planSlug?: string }) => {
  const filter = params.planId
    ? `id=eq.${encodeURIComponent(params.planId)}`
    : `slug=eq.${encodeURIComponent(params.planSlug ?? "")}`

  const response = await supabaseRest(
    `plans?${filter}&is_active=eq.true&select=id,slug,name,description,evaluation_credits,amount_cents,currency,mercado_pago_title&limit=1`,
  )
  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`Falha ao buscar plano: ${details.slice(0, 300)}`)
  }

  const plans = await response.json()
  return Array.isArray(plans) && plans.length ? plans[0] as Record<string, unknown> : null
}

const getAppBaseUrl = (req: Request) => {
  const configured = Deno.env.get("APP_BASE_URL")?.replace(/\/$/, "")
  if (configured) return configured

  const origin = req.headers.get("Origin")
  if (origin && allowedOrigins().includes(origin)) return origin

  return "https://arquiteturadapausa.com"
}

const getNotificationUrl = () => {
  const configured = Deno.env.get("MERCADO_PAGO_NOTIFICATION_URL")
  if (configured) return configured

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  return SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/mercado-pago-webhook` : null
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
    const planId = typeof payload.plan_id === "string" ? payload.plan_id.trim() : ""
    const planSlug = typeof payload.plan_slug === "string" ? payload.plan_slug.trim() : ""
    if (!planId && !planSlug) {
      return json(req, { error: "Informe o plano escolhido." }, 400)
    }

    const plan = await fetchPlan({ planId, planSlug })
    if (!plan) return json(req, { error: "Plano não encontrado ou inativo." }, 404)

    const productType = "evaluation_credit"
    const quantity = 1
    const amountCents = Number(plan.amount_cents ?? 0)
    const creditQuantity = Number(plan.evaluation_credits ?? 0)
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
    const mockPayments = Deno.env.get("LOCAL_DEV_MOCK_PAYMENTS") === "true"

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json(req, { error: "O plano escolhido está sem preço válido." }, 500)
    }
    if (!Number.isFinite(creditQuantity) || creditQuantity <= 0) {
      return json(req, { error: "O plano escolhido está sem quantidade válida de avaliações." }, 500)
    }

    const orderId = crypto.randomUUID()
    const externalReference = `arqpausa:${orderId}`
    const userMetadata = getUserMetadata(user as Record<string, unknown>)
    const userEmail = String((user as Record<string, unknown>).email ?? "").toLowerCase()
    const appBaseUrl = getAppBaseUrl(req)

    const order = {
      id: orderId,
      user_id: (user as Record<string, unknown>).id,
      user_email: userEmail,
      provider: "mercado_pago",
      plan_id: plan.id,
      plan_slug: plan.slug,
      plan_name: plan.name,
      credits_purchased: creditQuantity,
      product_type: productType,
      quantity,
      amount_cents: amountCents,
      currency: "BRL",
      status: "pending",
      external_reference: externalReference,
    }

    const insertResponse = await supabaseRest("payment_orders", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(order),
    })
    if (!insertResponse.ok) {
      const details = await insertResponse.text().catch(() => "")
      throw new Error(`Falha ao registrar pedido: ${details.slice(0, 300)}`)
    }

    if (mockPayments) {
      const checkoutUrl = `${appBaseUrl}/pagamento?status=mock&pedido=${encodeURIComponent(orderId)}`
      await supabaseRest(`payment_orders?id=eq.${orderId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          checkout_url: checkoutUrl,
          provider_payload: { local_mock: true },
          updated_at: new Date().toISOString(),
        }),
      })
      return json(req, {
        success: true,
        local_mock: true,
        order_id: orderId,
        checkout_url: checkoutUrl,
        plan: {
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          evaluation_credits: creditQuantity,
          amount_cents: amountCents,
          currency: plan.currency ?? "BRL",
        },
      })
    }

    if (!accessToken) {
      await supabaseRest(`payment_orders?id=eq.${orderId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", updated_at: new Date().toISOString() }),
      })
      return json(req, { error: "Configure MERCADO_PAGO_ACCESS_TOKEN no Supabase." }, 500)
    }

    const notificationUrl = getNotificationUrl()
    const title = String(plan.mercado_pago_title ?? plan.name ?? "Plano Arquitetura da Pausa")
    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          id: String(plan.slug ?? productType),
          title,
          quantity,
          currency_id: String(plan.currency ?? "BRL"),
          unit_price: Number((amountCents / 100).toFixed(2)),
        },
      ],
      payer: {
        email: userEmail,
        name: String(userMetadata.full_name ?? userMetadata.name ?? "").trim() || undefined,
      },
      back_urls: {
        success: `${appBaseUrl}/pagamento?status=success&pedido=${encodeURIComponent(orderId)}`,
        pending: `${appBaseUrl}/pagamento?status=pending&pedido=${encodeURIComponent(orderId)}`,
        failure: `${appBaseUrl}/pagamento?status=failure&pedido=${encodeURIComponent(orderId)}`,
      },
      auto_return: "approved",
      external_reference: externalReference,
      metadata: {
        order_id: orderId,
        user_id: (user as Record<string, unknown>).id,
        plan_id: plan.id,
        plan_slug: plan.slug,
        credits_purchased: creditQuantity,
        product_type: productType,
      },
    }

    if (notificationUrl?.startsWith("https://")) {
      preferenceBody.notification_url = notificationUrl
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": orderId,
      },
      body: JSON.stringify(preferenceBody),
    })

    const mpPreference = await mpResponse.json().catch(() => ({}))
    if (!mpResponse.ok) {
      await supabaseRest(`payment_orders?id=eq.${orderId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          provider_payload: mpPreference,
          updated_at: new Date().toISOString(),
        }),
      })
      return json(req, { error: "Mercado Pago recusou a criação do checkout.", details: mpPreference }, 502)
    }

    await supabaseRest(`payment_orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        preference_id: mpPreference.id ?? null,
        checkout_url: mpPreference.init_point ?? null,
        sandbox_checkout_url: mpPreference.sandbox_init_point ?? null,
        provider_payload: mpPreference,
        updated_at: new Date().toISOString(),
      }),
    })

    return json(req, {
      success: true,
      order_id: orderId,
      preference_id: mpPreference.id ?? null,
      checkout_url: mpPreference.init_point ?? null,
      sandbox_checkout_url: mpPreference.sandbox_init_point ?? null,
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        evaluation_credits: creditQuantity,
        amount_cents: amountCents,
        currency: plan.currency ?? "BRL",
      },
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : "Erro ao criar checkout."
    return json(req, { error: message }, 500)
  }
})
