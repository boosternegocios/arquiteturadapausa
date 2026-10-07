// Edge Function: dispatch-journey-event
// Registra eventos da jornada e, se configurado, envia para o n8n.
//
// Secrets:
//   N8N_JOURNEY_WEBHOOK_URL -> (opcional) webhook n8n para eventos gerais da jornada
//   N8N_WEBHOOK_URL         -> (opcional) fallback genérico
//   N8N_WEBHOOK_SECRET      -> (opcional) segredo enviado no header X-Webhook-Secret
// Variáveis locais de teste, não configurar em produção:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true

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

const ALLOWED_EVENTS = new Set([
  "fatigue_assessment_started",
  "fatigue_category_completed",
  "fatigue_assessment_completed",
  "recovery_step_completed",
  "time_radar_completed",
  "beliefs_reflection_completed",
  "exercise_completed",
  "all_exercises_completed",
])

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

const textValue = (value: unknown, maxLength: number) =>
  String(value ?? "").trim().slice(0, maxLength)

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

const serviceFetch = async (path: string, init: RequestInit = {}) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_KEY) return null

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers || {}),
    },
  })
}

const findExistingEvent = async (eventKey: string) => {
  const response = await serviceFetch(
    `automation_events?event_key=eq.${encodeURIComponent(eventKey)}&select=id,event_key&limit=1`,
    { method: "GET" },
  )
  if (!response?.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

const logAutomationEvent = async (params: {
  eventType: string
  eventKey?: string | null
  userId?: string | null
  userEmail?: string | null
  payload: Record<string, unknown>
  deliveryStatus: "sent" | "failed" | "skipped"
  deliveryTarget?: string | null
  deliveredAt?: string | null
  errorMessage?: string | null
}) => {
  try {
    await serviceFetch("automation_events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_type: params.eventType,
        event_key: params.eventKey ?? null,
        source: "dispatch-journey-event",
        user_id: params.userId ?? null,
        user_email: params.userEmail ?? null,
        payload: params.payload,
        delivery_status: params.deliveryStatus,
        delivery_target: params.deliveryTarget ?? null,
        delivered_at: params.deliveredAt ?? null,
        error_message: params.errorMessage ?? null,
      }),
    })
  } catch (e) {
    console.warn("Falha ao registrar evento de automação (ignorado):", e)
  }
}

const postWithTimeout = async (url: string, init: RequestInit, timeoutMs = 10000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const dispatchWebhook = async (eventType: string, payload: Record<string, unknown>) => {
  const webhookUrl = Deno.env.get("N8N_JOURNEY_WEBHOOK_URL") || Deno.env.get("N8N_WEBHOOK_URL")
  if (!webhookUrl) return { status: "skipped" as const, error: "N8N_JOURNEY_WEBHOOK_URL não configurado." }

  const secret = Deno.env.get("N8N_WEBHOOK_SECRET")
  const response = await postWithTimeout(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Arqpausa-Event": eventType,
      ...(secret ? { "X-Webhook-Secret": secret } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(`n8n respondeu ${response.status}: ${details.slice(0, 300)}`)
  }

  return { status: "sent" as const }
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

    const body = await req.json()
    const eventType = textValue(body.event, 80)
    const eventKey = textValue(body.event_key, 180) || null
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {}

    if (!ALLOWED_EVENTS.has(eventType)) {
      return json(req, { error: "Evento não permitido." }, 400)
    }

    if (eventKey) {
      const existingEvent = await findExistingEvent(eventKey)
      if (existingEvent) {
        return json(req, { success: true, duplicate: true })
      }
    }

    const userMetadata = getUserMetadata(user)
    const userId = typeof user.id === "string" ? user.id : null
    const userEmail = typeof user.email === "string" ? user.email : null

    const eventPayload = {
      event: eventType,
      event_key: eventKey,
      source: "arq_pausa_app",
      occurred_at: new Date().toISOString(),
      request_id: crypto.randomUUID(),
      user: {
        id: userId,
        email: userEmail,
        name: userMetadata.full_name ?? userMetadata.name ?? null,
        phone: userMetadata.phone ?? null,
      },
      payload,
    }

    try {
      const result = await dispatchWebhook(eventType, eventPayload)
      await logAutomationEvent({
        eventType,
        eventKey,
        userId,
        userEmail,
        payload: eventPayload,
        deliveryStatus: result.status,
        deliveryTarget: "n8n",
        deliveredAt: result.status === "sent" ? new Date().toISOString() : null,
        errorMessage: result.status === "skipped" ? result.error : null,
      })

      return json(req, { success: true, delivery_status: result.status })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await logAutomationEvent({
        eventType,
        eventKey,
        userId,
        userEmail,
        payload: eventPayload,
        deliveryStatus: "failed",
        deliveryTarget: "n8n",
        errorMessage: message,
      })

      return json(req, { success: true, delivery_status: "failed" })
    }
  } catch (err) {
    console.error("Erro interno:", err)
    return json(req, { error: "Erro interno ao processar evento." }, 500)
  }
})
