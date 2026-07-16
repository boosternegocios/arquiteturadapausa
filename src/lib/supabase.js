import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env.local")
}

// Timeout simples que PRESERVA o erro original (AbortError / TypeError).
// Importante: o auth interno do Supabase decide se re-tenta a renovação do
// token baseado no TIPO do erro — converter para um Error genérico quebrava
// essa lógica e deixava o cliente travado após a aba ficar em segundo plano.
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  // Respeita um signal externo, se o chamador passou um
  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'arqpausa-auth-v2',
    persistSession: true,
    // Bypass navigator.locks to prevent tab-switch freezes
    lock: async (_name, _acquireTimeout, fn) => fn()
  },
  global: {
    fetch: fetchWithTimeout
  }
})

/**
 * Verifica se o cliente Supabase está respondendo.
 * Se o auth interno estiver em deadlock (pode acontecer após a aba ficar
 * muito tempo em segundo plano), getSession() nunca resolve — este helper
 * detecta isso via timeout. Um erro conta como "responsivo" (não travado).
 */
export const isSupabaseResponsive = async (timeoutMs = 5000) => {
  const result = await Promise.race([
    supabase.auth.getSession().then(() => 'ok').catch(() => 'ok'),
    new Promise(resolve => setTimeout(() => resolve('timeout'), timeoutMs))
  ])
  return result === 'ok'
}

/**
 * Envolve uma promise com timeout — usado nas ações de salvar/avançar
 * para que a UI nunca fique presa em "carregando" indefinidamente.
 */
export const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), ms)
    )
  ])
