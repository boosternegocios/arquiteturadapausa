type JsonRecord = Record<string, unknown>

export type AutomationEventLog = {
  id?: string
  event_type?: string
  event_key?: string | null
}

type WebhookConfig = {
  id: string
  event_type: string
  webhook_url: string
  delay_seconds: number | null
  is_active: boolean
}

type WebhookDelivery = {
  id: string
  event_id: string | null
  event_type: string
  event_key: string | null
  webhook_url: string
  payload: JsonRecord
  attempt_count: number | null
}

export const serviceFetch = async (path: string, init: RequestInit = {}) => {
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

const postWithTimeout = async (url: string, init: RequestInit, timeoutMs = 10000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const updateDelivery = async (deliveryId: string, payload: JsonRecord) => {
  await serviceFetch(`automation_webhook_deliveries?id=eq.${encodeURIComponent(deliveryId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  })
}

export const findExistingEvent = async (eventKey: string) => {
  const response = await serviceFetch(
    `automation_events?event_key=eq.${encodeURIComponent(eventKey)}&select=id,event_key&limit=1`,
    { method: "GET" },
  )
  if (!response?.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0 ? rows[0] as AutomationEventLog : null
}

export const logAutomationEvent = async (params: {
  eventType: string
  eventKey?: string | null
  source: string
  userId?: string | null
  userEmail?: string | null
  payload: JsonRecord
  deliveryStatus?: "pending" | "sent" | "failed" | "skipped"
  deliveryTarget?: string | null
  deliveredAt?: string | null
  errorMessage?: string | null
}) => {
  try {
    const response = await serviceFetch("automation_events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        event_type: params.eventType,
        event_key: params.eventKey ?? null,
        source: params.source,
        user_id: params.userId ?? null,
        user_email: params.userEmail ?? null,
        payload: params.payload,
        delivery_status: params.deliveryStatus ?? "pending",
        delivery_target: params.deliveryTarget ?? "webhook_config",
        delivered_at: params.deliveredAt ?? null,
        error_message: params.errorMessage ?? null,
      }),
    })

    if (!response?.ok) return null
    const rows = await response.json().catch(() => [])
    return Array.isArray(rows) && rows.length > 0 ? rows[0] as AutomationEventLog : null
  } catch (e) {
    console.warn("Falha ao registrar evento de automação (ignorado):", e)
    return null
  }
}

const fetchActiveConfigs = async (eventType: string) => {
  const response = await serviceFetch(
    `automation_webhook_configs?event_type=eq.${encodeURIComponent(eventType)}&is_active=eq.true&webhook_url=not.is.null&select=*`,
    { method: "GET" },
  )
  if (!response?.ok) return []
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) ? rows as WebhookConfig[] : []
}

const buildScheduledDate = (delaySeconds: number | null | undefined) => {
  const safeDelay = Math.max(0, Number(delaySeconds) || 0)
  return new Date(Date.now() + safeDelay * 1000).toISOString()
}

export const enqueueConfiguredWebhooks = async (params: {
  eventType: string
  eventKey?: string | null
  eventId?: string | null
  payload: JsonRecord
}) => {
  const configs = await fetchActiveConfigs(params.eventType)
  let queued = 0

  for (const config of configs) {
    const response = await serviceFetch("automation_webhook_deliveries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        config_id: config.id,
        event_id: params.eventId ?? null,
        event_type: params.eventType,
        event_key: params.eventKey ?? null,
        payload: params.payload,
        webhook_url: config.webhook_url,
        scheduled_for: buildScheduledDate(config.delay_seconds),
        status: "pending",
      }),
    })

    if (response?.ok) queued += 1
    if (response && !response.ok && response.status !== 409) {
      const details = await response.text().catch(() => "")
      console.warn("Falha ao agendar webhook:", response.status, details)
    }
  }

  return queued
}

const getEvaluationStatus = async (evaluationId: string) => {
  const response = await serviceFetch(
    `evaluations?id=eq.${encodeURIComponent(evaluationId)}&select=id,status&limit=1`,
    { method: "GET" },
  )
  if (!response?.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0 ? rows[0]?.status as string | null : null
}

const getNestedPayload = (delivery: WebhookDelivery) => {
  const payload = delivery.payload && typeof delivery.payload === "object" ? delivery.payload : {}
  const nested = payload.payload
  return nested && typeof nested === "object" ? nested as JsonRecord : {}
}

export const processDueWebhookDeliveries = async (limit = 30) => {
  const now = new Date().toISOString()
  const response = await serviceFetch(
    `automation_webhook_deliveries?status=eq.pending&scheduled_for=lte.${encodeURIComponent(now)}&select=*&order=scheduled_for.asc&limit=${limit}`,
    { method: "GET" },
  )

  if (!response?.ok) {
    const details = await response?.text().catch(() => "")
    throw new Error(`Não foi possível buscar webhooks pendentes. ${details}`)
  }

  const deliveries = await response.json().catch(() => []) as WebhookDelivery[]
  const secret = Deno.env.get("N8N_WEBHOOK_SECRET")
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const delivery of deliveries) {
    const attemptCount = Number(delivery.attempt_count || 0) + 1

    try {
      if (delivery.event_type === "assessment_draft_stale") {
        const nestedPayload = getNestedPayload(delivery)
        const evaluationId = typeof nestedPayload.evaluation_id === "string" ? nestedPayload.evaluation_id : null
        const status = evaluationId ? await getEvaluationStatus(evaluationId) : null

        if (status !== "draft") {
          skipped += 1
          await updateDelivery(delivery.id, {
            status: "skipped",
            attempt_count: attemptCount,
            delivered_at: new Date().toISOString(),
            error_message: status ? "A avaliação já não está mais em rascunho." : "Avaliação não encontrada.",
          })
          continue
        }
      }

      const webhookResponse = await postWithTimeout(delivery.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Arqpausa-Event": delivery.event_type,
          ...(secret ? { "X-Webhook-Secret": secret } : {}),
        },
        body: JSON.stringify(delivery.payload),
      })

      if (!webhookResponse.ok) {
        const details = await webhookResponse.text().catch(() => "")
        throw new Error(`Webhook respondeu ${webhookResponse.status}: ${details.slice(0, 300)}`)
      }

      sent += 1
      await updateDelivery(delivery.id, {
        status: "sent",
        attempt_count: attemptCount,
        delivered_at: new Date().toISOString(),
        error_message: null,
      })
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      await updateDelivery(delivery.id, {
        status: "failed",
        attempt_count: attemptCount,
        error_message: message,
      })
    }
  }

  return {
    processed: deliveries.length,
    sent,
    failed,
    skipped,
  }
}
