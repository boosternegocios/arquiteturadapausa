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
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo runtime.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const DEFAULT_TO = "roselli.carolina@gmail.com"
const SUBJECT = "Nova solicitação de plano personalizado - Arquitetura da Pausa"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)

  try {
    const { nome, email, telefone, mensagem } = await req.json()

    if (!nome || !email || !telefone) {
      return json({ error: "Preencha nome, email e telefone." }, 400)
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com"
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465")
    const SMTP_USER = Deno.env.get("SMTP_USER")
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")
    const MAIL_TO = Deno.env.get("MAIL_TO") ?? DEFAULT_TO

    if (!SMTP_USER || !SMTP_PASSWORD) {
      console.error("Config ausente: SMTP_USER ou SMTP_PASSWORD não definidos.")
      return json({ error: "Configuração de email ausente no servidor." }, 500)
    }

    const safe = (v: unknown) => String(v ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")
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
              ${linha("Nome", safe(nome))}
              ${linha("E-mail", safe(email))}
              ${linha("Telefone", safe(telefone))}
              ${linha("Mensagem", safe(mensagem))}
            </table>
            <p style="margin:24px 0 0; font-size:12px; color:#9ca3af;">Enviado automaticamente pelo app Arquitetura da Pausa. Responda este email para falar direto com a pessoa.</p>
          </div>
        </div>
      </div>
    `

    const texto =
      `Nova solicitação de plano personalizado - Arquitetura da Pausa\n\n` +
      `Nome: ${nome}\nE-mail: ${email}\nTelefone: ${telefone}\nMensagem: ${mensagem || "—"}\n`

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

    return json({ success: true })
  } catch (err) {
    console.error("Erro interno:", err)
    return json({ error: "Erro interno ao processar a solicitação." }, 500)
  }
})
