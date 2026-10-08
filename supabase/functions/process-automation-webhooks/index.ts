// Edge Function: process-automation-webhooks
// Processa webhooks configurados que chegaram ao horário agendado.
//
// Pode ser chamada pelo painel admin ou por um agendamento externo.
// Para agendamento sem sessão de admin, configure AUTOMATION_PROCESS_SECRET e envie
// o mesmo valor no header X-Automation-Secret.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { processDueWebhookDeliveries, serviceFetch } from "../_shared/automation-webhooks.ts"

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  })

const getAuthenticatedUser = async (req: Request) => {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!jwt || (anonKey && jwt === anonKey)) return null

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!SUPABASE_URL || !SERVICE_KEY) return null

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  })

  if (!response.ok) return null
  return response.json()
}

const isAdminUser = async (email: string | null) => {
  if (!email) return false

  const response = await serviceFetch(
    `admins?email=eq.${encodeURIComponent(email)}&select=email&limit=1`,
    { method: "GET" },
  )
  if (!response?.ok) return false

  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}

const isAuthorized = async (req: Request) => {
  const processSecret = Deno.env.get("AUTOMATION_PROCESS_SECRET")
  const providedSecret = req.headers.get("X-Automation-Secret")
  if (processSecret && providedSecret && providedSecret === processSecret) return true

  const user = await getAuthenticatedUser(req)
  const email = typeof user?.email === "string" ? user.email : null
  return isAdminUser(email)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: isAllowedOrigin(req) ? 200 : 403, headers: corsHeaders(req) })
  }
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida." }, 403)
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405)

  try {
    if (!(await isAuthorized(req))) {
      return json(req, { error: "Acesso não autorizado." }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const limit = Math.min(100, Math.max(1, Number(body?.limit) || 50))
    const result = await processDueWebhookDeliveries(limit)
    return json(req, { success: true, ...result })
  } catch (error) {
    console.error("Erro ao processar webhooks:", error)
    const message = error instanceof Error ? error.message : "Erro interno ao processar webhooks."
    return json(req, { error: message }, 500)
  }
})
