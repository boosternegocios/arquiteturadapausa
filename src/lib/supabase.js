import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env.local")
}

const customFetch = async (url, options) => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const controller = new AbortController()
    // Timeout curto na 1ª tentativa para detectar conexão morta rapidamente, timeouts maiores nas tentativas de recuperação
    const timeout = attempt === 0 ? 5000 : 15000; 
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Se for a última tentativa, lança o erro para o usuário
      if (attempt === maxRetries - 1) {
        throw new Error('Falha de conexão. Verifique sua internet e tente novamente.')
      }
      
      // Espera um pouco antes de tentar de novo
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      attempt++
    }
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
