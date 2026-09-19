import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isAuthApiError, isAuthSessionMissingError, type Session } from '@supabase/supabase-js'
import { setFlash } from '../data/auth'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function start() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        // A login found in storage may already have been ended by Supabase (for example when
        // a PIN was reset, or after signing out elsewhere). Its token can still look valid, so
        // ask the server. Only a definite "this session is gone" answer signs us out; a network
        // hiccup does not.
        const { error } = await supabase.auth.getUser()
        if (error && (isAuthSessionMissingError(error) || (isAuthApiError(error) && (error.status === 401 || error.status === 403)))) {
          setFlash('Your sign-in expired. Please sign in again with your username and PIN.')
          await supabase.auth.signOut({ scope: 'local' })
          if (alive) { setSession(null); setLoading(false) }
          return
        }
      }
      if (alive) { setSession(data.session); setLoading(false) }
    }
    start()

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])

  // "local" signs out THIS browser only. The default would sign the account out of every device.
  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
