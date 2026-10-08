// Edge Function: start-paid-evaluation
// Consome um crédito disponível e cria uma nova avaliação em rascunho.
// A operação real é feita por uma RPC transacional no banco para evitar duplo consumo.
//
// Variáveis locais de teste:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true
//   LOCAL_DEV_MOCK_PAID_EVALUATION=true
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo runtime.

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

const getJwt = (req: Request) =>
  (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim()

const getAuthenticatedUser = async (req: Request) => {
  const jwt = getJwt(req)
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
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Configuração Supabase ausente no servidor.")

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  })

  if (!response.ok) return null
  return response.json()
}

const getUserMetadata = (user: Record<string, unknown>) => {
  const userMetadata = user.user_metadata
  if (userMetadata && typeof userMetadata === "object") return userMetadata as Record<string, unknown>

  const rawMetadata = user.raw_user_meta_data
  if (rawMetadata && typeof rawMetadata === "object") return rawMetadata as Record<string, unknown>

  return {}
}

const dispatchEvaluationStartedEvent = async (user: Record<string, unknown>, evaluationId: string) => {
  const eventType = "fatigue_assessment_started"
  const eventKey = `fatigue_assessment_started:${evaluationId}`

  if (await findExistingEvent(eventKey)) return

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
    payload: {
      evaluation_id: evaluationId,
      first_step: "assessment",
    },
  }

  const loggedEvent = await logAutomationEvent({
    eventType,
    eventKey,
    source: "start-paid-evaluation",
    userId,
    userEmail,
    payload: eventPayload,
    deliveryStatus: "pending",
  })

  await enqueueConfiguredWebhooks({
    eventType,
    eventKey,
    eventId: loggedEvent?.id ?? null,
    payload: eventPayload,
  })

  await enqueueConfiguredWebhooks({
    eventType: "assessment_draft_stale",
    eventKey: `assessment_draft_stale:${eventKey}`,
    eventId: loggedEvent?.id ?? null,
    payload: {
      ...eventPayload,
      event: "assessment_draft_stale",
      triggered_by: eventType,
    },
  })

  await processDueWebhookDeliveries(20).catch((error) => {
    console.warn("Falha ao processar webhooks imediatos:", error)
  })
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

    if (Deno.env.get("LOCAL_DEV_MOCK_PAID_EVALUATION") === "true") {
      return json(req, {
        success: true,
        local_mock: true,
        evaluation_id: crypto.randomUUID(),
      })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
    const jwt = getJwt(req)
    if (!SUPABASE_URL || !ANON_KEY || !jwt) {
      return json(req, { error: "Configuração Supabase ausente no servidor." }, 500)
    }

    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_evaluation_credit_and_create_evaluation`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })

    const result = await rpcResponse.json().catch(() => null)
    if (!rpcResponse.ok) {
      const message = typeof result === "object" && result && "message" in result
        ? String((result as Record<string, unknown>).message)
        : "Não foi possível iniciar a avaliação."
      return json(req, { error: message }, rpcResponse.status === 400 ? 409 : rpcResponse.status)
    }

    const evaluationId = typeof result === "string" ? result : String(result ?? "")

    if (evaluationId) {
      await dispatchEvaluationStartedEvent(user, evaluationId)
    }

    return json(req, {
      success: true,
      evaluation_id: evaluationId || result,
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : "Erro ao iniciar avaliação."
    return json(req, { error: message }, 500)
  }
})
