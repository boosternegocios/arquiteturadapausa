import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase credentials in .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'arqpausa-auth-v2',
    persistSession: true,
    // Bypass navigator.locks to prevent tab-switch freezes
    lock: async (_name, _acquireTimeout, fn) => fn()
  }
})
