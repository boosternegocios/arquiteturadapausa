// Edge Function: send-plan-request
// Recebe os dados do formulário "Plano de Ação" e envia por email via SMTP (Hostinger).
// Também registra a solicitação na tabela contact_requests (best-effort).
//
// Secrets necessários (configurados no Supabase):
//   SMTP_HOST      -> servidor SMTP. Hostinger: "smtp.hostinger.com" (ou "smtp.titan.email" se for Titan)
//   SMTP_PORT      -> porta. Normalmente 465 (SSL). Pode ser 587 (STARTTLS).
//   SMTP_USER      -> a caixa de email criada na Hostinger (também é o remetente), ex: plano@dominio.com
//   SMTP_PASSWORD  -> a senha dessa caixa de email
//   MAIL_TO        -> (opcional) email que recebe; default abaixo
//   N8N_PLAN_REQUEST_WEBHOOK_URL -> (opcional) webhook do n8n para avisar solicitação de plano/mentoria
//   N8N_WEBHOOK_SECRET           -> (opcional) segredo enviado no header X-Webhook-Secret
// Variáveis locais de teste, não configurar em produção:
//   LOCAL_DEV_ALLOW_UNAUTHENTICATED=true
//   LOCAL_DEV_SKIP_EMAIL_DELIVERY=true
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const DEFAULT_TO = "roselli.carolina@gmail.com"
const SUBJECT = "Nova solicitação de plano personalizado - Arquitetura da Pausa"
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
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

const textValue = (value: unknown, maxLength: number) =>
  String(value ?? "").trim().slice(0, maxLength)

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const getUserMetadata = (user: Record<string, unknown>) => {
  const userMetadata = user.user_metadata
  if (userMetadata && typeof userMetadata === "object") return userMetadata as Record<string, unknown>

  const rawMetadata = user.raw_user_meta_data
  if (rawMetadata && typeof rawMetadata === "object") return rawMetadata as Record<string, unknown>

  return {}
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

const logAutomationEvent = async (params: {
  eventType: string
  userId?: string | null
  userEmail?: string | null
  payload: Record<string, unknown>
  deliveryStatus: "sent" | "failed" | "skipped"
  deliveryTarget?: string | null
  deliveredAt?: string | null
  errorMessage?: string | null
}) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!SUPABASE_URL || !SERVICE_KEY) return

    await fetch(`${SUPABASE_URL}/rest/v1/automation_events`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_type: params.eventType,
        source: "send-plan-request",
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

const dispatchPlanRequestWebhook = async (
  eventPayload: Record<string, unknown>,
  userId?: string | null,
  userEmail?: string | null,
) => {
  const webhookUrl = Deno.env.get("N8N_PLAN_REQUEST_WEBHOOK_URL") || Deno.env.get("N8N_WEBHOOK_URL")
  const eventType = "plan_requested"

  if (!webhookUrl) {
    await logAutomationEvent({
      eventType,
      userId,
      userEmail,
      payload: eventPayload,
      deliveryStatus: "skipped",
      deliveryTarget: "n8n",
      errorMessage: "N8N_PLAN_REQUEST_WEBHOOK_URL não configurado.",
    })
    return
  }

  try {
    const secret = Deno.env.get("N8N_WEBHOOK_SECRET")
    const response = await postWithTimeout(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Arqpausa-Event": eventType,
        ...(secret ? { "X-Webhook-Secret": secret } : {}),
      },
      body: JSON.stringify(eventPayload),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => "")
      throw new Error(`n8n respondeu ${response.status}: ${details.slice(0, 300)}`)
    }

    await logAutomationEvent({
      eventType,
      userId,
      userEmail,
      payload: eventPayload,
      deliveryStatus: "sent",
      deliveryTarget: "n8n",
      deliveredAt: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn("Falha ao enviar webhook n8n (ignorado):", message)
    await logAutomationEvent({
      eventType,
      userId,
      userEmail,
      payload: eventPayload,
      deliveryStatus: "failed",
      deliveryTarget: "n8n",
      errorMessage: message,
    })
  }
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: isAllowedOrigin(req) ? 200 : 403, headers: corsHeaders(req) })
  }
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida." }, 403)
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405)

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(req, { error: "Usuário não autenticado." }, 401)

    const payload = await req.json()
    const nome = textValue(payload.nome, 120)
    const email = textValue(payload.email, 254).toLowerCase()
    const telefone = textValue(payload.telefone, 30)
    const mensagem = textValue(payload.mensagem, 1000)

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const phoneDigits = telefone.replace(/\D/g, "")

    if (!nome || !email || !telefone) {
      return json(req, { error: "Preencha nome, email e telefone." }, 400)
    }
    if (!emailOk || phoneDigits.length < 8) {
      return json(req, { error: "Informe um email e telefone válidos." }, 400)
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com"
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465")
    const SMTP_USER = Deno.env.get("SMTP_USER")
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")
    const MAIL_TO = Deno.env.get("MAIL_TO") ?? DEFAULT_TO
    const skipEmailDelivery = Deno.env.get("LOCAL_DEV_SKIP_EMAIL_DELIVERY") === "true"

    if (!skipEmailDelivery && (!SMTP_USER || !SMTP_PASSWORD)) {
      console.error("Config ausente: SMTP_USER ou SMTP_PASSWORD não definidos.")
      return json(req, { error: "Configuração de email ausente no servidor." }, 500)
    }

    const linha = (label: string, valor: string) =>
      `<tr>
         <td style="padding:10px 16px; background:#f7f3ec; font-weight:bold; color:#004b4c; width:150px; border-bottom:1px solid #ece5d8;">${label}</td>
         <td style="padding:10px 16px; color:#1f2937; border-bottom:1px solid #ece5d8;">${valor || "—"}</td>
       </tr>`

    const html = `
      <div style="background:#fcfaf5; padding:32px; font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #ece5d8;">
          <div style="background:#004b4c; padding:24px 32px;">
            <h1 style="margin:0; color:#ffffff; font-size:18px; letter-spacing:0.5px;">Arquitetura da Pausa</h1>
            <p style="margin:6px 0 0; color:#1ed7a4; font-size:13px; font-weight:bold;">Nova solicitação de plano personalizado</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 20px; color:#4a5568; font-size:14px;">Um usuário concluiu a reflexão e solicitou um plano de ação personalizado. Dados de contato:</p>
            <table style="width:100%; border-collapse:collapse; font-size:14px; border:1px solid #ece5d8; border-radius:8px; overflow:hidden;">
              ${linha("Nome", escapeHtml(nome))}
              ${linha("E-mail", escapeHtml(email))}
              ${linha("Telefone", escapeHtml(telefone))}
              ${linha("Mensagem", escapeHtml(mensagem))}
            </table>
            <p style="margin:24px 0 0; font-size:12px; color:#9ca3af;">Enviado automaticamente pelo app Arquitetura da Pausa. Responda este email para falar direto com a pessoa.</p>
          </div>
        </div>
      </div>
    `

    const texto =
      `Nova solicitação de plano personalizado - Arquitetura da Pausa\n\n` +
      `Nome: ${nome}\nE-mail: ${email}\nTelefone: ${telefone}\nMensagem: ${mensagem || "—"}\n`

    if (skipEmailDelivery) {
      console.warn("LOCAL_DEV_SKIP_EMAIL_DELIVERY=true: envio SMTP ignorado para teste local.")
    } else {
      // Envia o email via SMTP (Hostinger)
      const client = new SMTPClient({
        connection: {
          hostname: SMTP_HOST,
          port: SMTP_PORT,
          tls: SMTP_PORT === 465, // 465 = SSL implícito; 587 = STARTTLS
          auth: { username: SMTP_USER, password: SMTP_PASSWORD },
        },
      })

      try {
        await client.send({
          from: `Arquitetura da Pausa <${SMTP_USER}>`,
          to: MAIL_TO,
          replyTo: email,
          subject: SUBJECT,
          content: texto,
          html,
        })
      } finally {
        await client.close()
      }
    }

    // Registra no banco (best-effort — não falha o envio se der erro)
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      if (SUPABASE_URL && SERVICE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ nome, email, telefone, mensagem: mensagem ?? null }),
        })
      }
    } catch (e) {
      console.warn("Falha ao registrar no banco (ignorado):", e)
    }

    const userMetadata = getUserMetadata(user)
    const eventPayload = {
      event: "plan_requested",
      source: "arq_pausa_app",
      occurred_at: new Date().toISOString(),
      request_id: crypto.randomUUID(),
      user: {
        id: user.id ?? null,
        email: user.email ?? email,
        name: userMetadata.full_name ?? userMetadata.name ?? nome,
        phone: userMetadata.phone ?? telefone,
      },
      contact: {
        nome,
        email,
        telefone,
        mensagem,
        has_message: mensagem.length > 0,
      },
      routing: {
        notify_owner: true,
        manual_review_required: mensagem.length > 0,
        automatic_reply_allowed: mensagem.length === 0,
      },
    }

    await dispatchPlanRequestWebhook(
      eventPayload,
      typeof user.id === "string" ? user.id : null,
      typeof user.email === "string" ? user.email : email,
    )

    return json(req, { success: true })
  } catch (err) {
    console.error("Erro interno:", err)
    return json(req, { error: "Erro interno ao processar a solicitação." }, 500)
  }
})
