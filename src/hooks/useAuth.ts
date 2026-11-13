import { useCallback, useEffect, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from '../lib/supabase'

export type AuthMode = 'sign-in' | 'sign-up' | 'recovery' | 'update-password'

export interface AuthController {
  configured: boolean
  loading: boolean
  session: Session | null
  passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  finishPasswordRecovery: () => void
  cancelPasswordRecovery: () => void
  signOut: () => Promise<void>
}

export function useAuth(): AuthController {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return

    let active = true
    const handleAuthChange = (event: AuthChangeEvent, nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (!error) setSession(data.session)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase no está configurado en esta versión de la aplicación.')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase no está configurado en esta versión de la aplicación.')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    })
    if (error) throw error
    return { confirmationRequired: data.session === null }
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase no está configurado en esta versión de la aplicación.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getAuthRedirectUrl() })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase no está configurado en esta versión de la aplicación.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const finishPasswordRecovery = useCallback(() => setPasswordRecovery(false), [])
  const cancelPasswordRecovery = useCallback(() => setPasswordRecovery(false), [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  }, [])

  return {
    configured: isSupabaseConfigured,
    loading,
    session,
    passwordRecovery,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    finishPasswordRecovery,
    cancelPasswordRecovery,
    signOut,
  }
}
