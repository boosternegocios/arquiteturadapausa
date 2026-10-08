// Edge Function: dispatch-journey-event
// Registra eventos da jornada e agenda webhooks configurados no painel admin.
//
// Variáveis locais de teste, não configurar em produção:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import {
  enqueueConfiguredWebhooks,
  findExistingEvent,
  logAutomationEvent,
  processDueWebhookDeliveries,
} from "../_shared/automation-webhooks.ts"

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
  "user_registered",
  "fatigue_assessment_started",
  "fatigue_category_completed",
  "fatigue_assessment_completed",
  "recovery_step_completed",
  "time_radar_completed",
  "beliefs_reflection_completed",
  "exercise_completed",
  "all_exercises_completed",
])

const PUBLIC_EVENTS = new Set(["user_registered"])

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

const getUserMetadata = (user: Record<string, unknown> | null) => {
  if (!user) return {}
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

const enqueueJourneyWebhooks = async (eventType: string, eventKey: string | null, eventId: string | null, eventPayload: Record<string, unknown>) => {
  let queued = await enqueueConfiguredWebhooks({
    eventType,
    eventKey,
    eventId,
    payload: eventPayload,
  })

  if (eventType === "fatigue_assessment_started") {
    const staleEventKey = eventKey ? `assessment_draft_stale:${eventKey}` : null
    queued += await enqueueConfiguredWebhooks({
      eventType: "assessment_draft_stale",
      eventKey: staleEventKey,
      eventId,
      payload: {
        ...eventPayload,
        event: "assessment_draft_stale",
        triggered_by: eventType,
      },
    })
  }

  return queued
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: isAllowedOrigin(req) ? 200 : 403, headers: corsHeaders(req) })
  }
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida." }, 403)
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405)

  try {
    const body = await req.json()
    const eventType = textValue(body.event, 80)
    const eventKey = textValue(body.event_key, 180) || null
    const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {}

    if (!ALLOWED_EVENTS.has(eventType)) {
      return json(req, { error: "Evento não permitido." }, 400)
    }

    const user = await getAuthenticatedUser(req)
    if (!user && !PUBLIC_EVENTS.has(eventType)) {
      return json(req, { error: "Usuário não autenticado." }, 401)
    }

    if (eventKey) {
      const existingEvent = await findExistingEvent(eventKey)
      if (existingEvent) {
        return json(req, { success: true, duplicate: true })
      }
    }

    const userMetadata = getUserMetadata(user)
    const payloadUser = payload.user && typeof payload.user === "object" ? payload.user as Record<string, unknown> : {}
    const userId = typeof user?.id === "string" ? user.id : (typeof payloadUser.id === "string" ? payloadUser.id : null)
    const userEmail = typeof user?.email === "string" ? user.email : (typeof payloadUser.email === "string" ? payloadUser.email : null)

    const eventPayload = {
      event: eventType,
      event_key: eventKey,
      source: "arq_pausa_app",
      occurred_at: new Date().toISOString(),
      request_id: crypto.randomUUID(),
      user: {
        id: userId,
        email: userEmail,
        name: userMetadata.full_name ?? userMetadata.name ?? payloadUser.name ?? null,
        phone: userMetadata.phone ?? payloadUser.phone ?? null,
      },
      payload,
    }

    const loggedEvent = await logAutomationEvent({
      eventType,
      eventKey,
      source: "dispatch-journey-event",
      userId,
      userEmail,
      payload: eventPayload,
      deliveryStatus: "pending",
    })

    const queued = await enqueueJourneyWebhooks(eventType, eventKey, loggedEvent?.id ?? null, eventPayload)
    const processed = await processDueWebhookDeliveries(20).catch((error) => {
      console.warn("Falha ao processar webhooks imediatos:", error)
      return { processed: 0, sent: 0, failed: 0, skipped: 0 }
    })

    return json(req, { success: true, delivery_status: queued > 0 ? "queued" : "skipped", queued, processed })
  } catch (err) {
    console.error("Erro interno:", err)
    return json(req, { error: "Erro interno ao processar evento." }, 500)
  }
})
