import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseResponsive } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async (currentUser) => {
      if (!currentUser) {
        setIsAdmin(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', currentUser.email)
          .maybeSingle()
        
        if (error) {
          console.error("Erro ao verificar admin:", error)
          setIsAdmin(false)
        } else if (data) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error("Exceção ao verificar admin:", err)
        setIsAdmin(false)
      }
    }

    let isMounted = true

    // Safety timeout in case Supabase hangs (e.g. deadlocked storage)
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("Supabase auth timeout! Forcing loading to false.");
        setLoading(false);
      }
    }, 3000);

    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) console.error("Session error:", error)
      if (!isMounted) return
      setSession(session)
      setUser(session?.user ?? null)
      await checkAdmin(session?.user ?? null)
      setLoading(false)
      clearTimeout(timeoutId)
    }).catch(err => {
      console.error("getSession crashed:", err)
      if (isMounted) setLoading(false)
    })

    // Listen for changes on auth state (logged in, signed out, etc.)
    // IMPORTANTE: este callback NÃO pode conter `await` de chamadas ao Supabase.
    // O Supabase espera o callback terminar antes de liberar o auth interno,
    // e a query espera o auth — deadlock que travava o app ao trocar de aba.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setSession(session)
      // Only update user state if the user ID actually changed.
      // This prevents TOKEN_REFRESHED events from creating a new user object
      // reference, which would cause all pages to re-fetch data unnecessarily.
      setUser(prev => {
        const newUser = session?.user ?? null
        if (prev?.id === newUser?.id) return prev  // same user, keep stable reference
        return newUser
      })
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'USER_UPDATED') {
        // Deferido para fora do callback (exigência do Supabase para evitar deadlock)
        setTimeout(() => {
          if (isMounted) checkAdmin(session?.user ?? null)
        }, 0)
      }
      setLoading(false)
      clearTimeout(timeoutId)
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [])

  // Watchdog global: quando a aba volta a ficar visível, verifica se o
  // cliente Supabase ainda responde. Se estiver travado (deadlock interno
  // após longo período em segundo plano), recarrega a página automaticamente.
  // As respostas em andamento são preservadas no localStorage pelas páginas,
  // então o usuário continua exatamente de onde parou — sem F5 manual.
  useEffect(() => {
    let wasHidden = false;

    const onVisibility = async () => {
      if (document.hidden) {
        wasHidden = true;
        return;
      }
      if (!wasHidden) return;
      wasHidden = false;

      const responsive = await isSupabaseResponsive(5000);
      if (!responsive) {
        console.warn('[Watchdog] Cliente Supabase travado — recuperando automaticamente...');
        window.location.reload();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Expose easy-to-use methods
  const signUp = (email, password, metadata) => supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: metadata,
      emailRedirectTo: window.location.origin
    }
  })
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()
  const resetPassword = (email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  })
  const updatePassword = (new_password) => supabase.auth.updateUser({ password: new_password })

  const value = {
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    user,
    session,
    loading,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
          <div className="w-12 h-12 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Carregando sistema...</p>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
