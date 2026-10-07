import { supabase } from './supabase'

export const clearLocalJourneyBackups = (userId) => {
  if (!userId) return

  try {
    localStorage.removeItem(`arqpausa-answers-${userId}`)
    localStorage.removeItem(`arqpausa-recovery-${userId}`)
  } catch (error) {
    console.warn('Não foi possível limpar os backups locais da jornada:', error)
  }
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
