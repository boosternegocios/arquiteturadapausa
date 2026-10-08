import { supabase } from './supabase'

export const clearLocalJourneyBackups = (userId) => {
  if (!userId) return

  try {
    const prefixes = [
      `arqpausa-answers-${userId}`,
      `arqpausa-recovery-${userId}`,
    ]

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key && prefixes.some(prefix => key === prefix || key.startsWith(`${prefix}-`))) {
        localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('Não foi possível limpar os backups locais da jornada:', error)
  }
}

export const ensureSignupEvaluationCredit = async () => {
  const { data, error } = await supabase.rpc('ensure_signup_evaluation_credit')
  if (error) throw error
  return data
}

export const startPaidEvaluation = async () => {
  const localFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL

  if (localFunctionsUrl) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    const response = await fetch(`${localFunctionsUrl.replace(/\/$/, '')}/start-paid-evaluation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || 'Não foi possível iniciar uma nova avaliação.')
    }
    return result
  }

  const { data, error } = await supabase.functions.invoke('start-paid-evaluation', { body: {} })
  if (error) throw error
  return data
}
