// Edge Function: create-payment-order
// Cria um pedido interno para Checkout Transparente/Card Payment Brick.
//
// Secrets necessários em produção:
//   MERCADO_PAGO_PUBLIC_KEY         -> public key do Mercado Pago usada pelo Brick
//   APP_BASE_URL                    -> URL pública do app
// Opcionais:
//   ALLOWED_ORIGINS                 -> lista separada por vírgula
// Variáveis locais de teste:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true
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

const fetchPendingOrder = async (orderId: string, userId: string) => {
  const response = await supabaseRest(
    `payment_orders?id=eq.${encodeURIComponent(orderId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.pending&select=id,user_id,user_email,plan_id,plan_slug,plan_name,credits_purchased,amount_cents,currency,status&limit=1`,
  )
  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`Falha ao buscar pedido: ${details.slice(0, 300)}`)
  }

  const orders = await response.json()
  return Array.isArray(orders) && orders.length ? orders[0] as Record<string, unknown> : null
}

const buildPaymentSession = (
  req: Request,
  publicKey: string,
  order: Record<string, unknown>,
  user: Record<string, unknown>,
  userMetadata: Record<string, unknown>,
) => json(req, {
  success: true,
  order_id: order.id,
  public_key: publicKey,
  amount: Number((Number(order.amount_cents ?? 0) / 100).toFixed(2)),
  payer: {
    email: String(order.user_email ?? user.email ?? "").toLowerCase(),
    name: String(userMetadata.full_name ?? userMetadata.name ?? "").trim() || undefined,
  },
  plan: {
    id: order.plan_id,
    slug: order.plan_slug,
    name: order.plan_name,
    description: null,
    evaluation_credits: Number(order.credits_purchased ?? 1),
    amount_cents: Number(order.amount_cents ?? 0),
    currency: order.currency ?? "BRL",
  },
})

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: isAllowedOrigin(req) ? 200 : 403, headers: corsHeaders(req) })
  }
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida." }, 403)
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405)

  try {
    const publicKey = Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")
    if (!publicKey) return json(req, { error: "Configure MERCADO_PAGO_PUBLIC_KEY no Supabase." }, 500)

    const user = await getAuthenticatedUser(req)
    if (!user) return json(req, { error: "Usuário não autenticado." }, 401)

    const payload = await req.json().catch(() => ({}))
    const orderId = typeof payload.order_id === "string" ? payload.order_id.trim() : ""
    const planId = typeof payload.plan_id === "string" ? payload.plan_id.trim() : ""
    const planSlug = typeof payload.plan_slug === "string" ? payload.plan_slug.trim() : ""
    const userMetadata = getUserMetadata(user as Record<string, unknown>)
    const userEmail = String((user as Record<string, unknown>).email ?? "").toLowerCase()

    if (orderId) {
      const pendingOrder = await fetchPendingOrder(orderId, String((user as Record<string, unknown>).id))
      if (!pendingOrder) return json(req, { error: "Pedido pendente não encontrado." }, 404)
      return buildPaymentSession(req, publicKey, pendingOrder, user as Record<string, unknown>, userMetadata)
    }

    if (!planId && !planSlug) return json(req, { error: "Informe o plano escolhido." }, 400)

    const plan = await fetchPlan({ planId, planSlug })
    if (!plan) return json(req, { error: "Plano não encontrado ou inativo." }, 404)

    const amountCents = Number(plan.amount_cents ?? 0)
    const creditQuantity = Number(plan.evaluation_credits ?? 0)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json(req, { error: "O plano escolhido está sem preço válido." }, 500)
    }
    if (!Number.isFinite(creditQuantity) || creditQuantity <= 0) {
      return json(req, { error: "O plano escolhido está sem quantidade válida de avaliações." }, 500)
    }

    const newOrderId = crypto.randomUUID()
    const externalReference = `arqpausa:${newOrderId}`

    const order = {
      id: newOrderId,
      user_id: (user as Record<string, unknown>).id,
      user_email: userEmail,
      provider: "mercado_pago",
      plan_id: plan.id,
      plan_slug: plan.slug,
      plan_name: plan.name,
      credits_purchased: creditQuantity,
      product_type: "evaluation_credit",
      quantity: 1,
      amount_cents: amountCents,
      currency: String(plan.currency ?? "BRL"),
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

    return json(req, {
      success: true,
      order_id: newOrderId,
      public_key: publicKey,
      amount: Number((amountCents / 100).toFixed(2)),
      payer: {
        email: userEmail,
        name: String(userMetadata.full_name ?? userMetadata.name ?? "").trim() || undefined,
      },
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description ?? null,
        evaluation_credits: creditQuantity,
        amount_cents: amountCents,
        currency: plan.currency ?? "BRL",
      },
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : "Erro ao criar pedido."
    return json(req, { error: message }, 500)
  }
})
