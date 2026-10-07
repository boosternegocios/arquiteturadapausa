import { supabase } from './supabase'

export const buildEventKey = (...parts) =>
  parts
    .filter(part => part !== undefined && part !== null && part !== '')
    .map(part => String(part).trim())
    .join(':')

export const dispatchJourneyEvent = async (event, payload = {}, options = {}) => {
  try {
    const body = {
      event,
      event_key: options.eventKey,
      payload,
    }

    const localFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
    if (!localFunctionsUrl) {
      const { error } = await supabase.functions.invoke('dispatch-journey-event', { body })
      if (error) throw error
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY
    const response = await fetch(`${localFunctionsUrl.replace(/\/$/, '')}/dispatch-journey-event`, {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error || `Erro HTTP ${response.status}`)
    }
  } catch (error) {
    console.warn(`[automation] Falha ao disparar evento "${event}"`, error)
  }
}
