import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env.local")
}

const customFetch = async (url, options) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 seconds timeout

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Conexão instável ou inativa. Por favor, tente novamente.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'arqpausa-auth-v2',
    persistSession: true,
    // Bypass navigator.locks to prevent tab-switch freezes
    lock: async (_name, _acquireTimeout, fn) => fn()
  },
  global: {
    fetch: customFetch
  }
})
