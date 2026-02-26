import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../supabaseClient'

type AuthResult = {
  ok: boolean
  error?: string
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }

    loadSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  const sendMagicLink = async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) {
        return { ok: false, error: error.message }
      }

      return { ok: true }
    } catch (caughtError) {
      const text = caughtError instanceof Error ? caughtError.message : String(caughtError)
      if (text.toLowerCase().includes('networkerror') || text.toLowerCase().includes('failed to fetch')) {
        return {
          ok: false,
          error:
            'Network error calling Supabase Auth. Check app/.env.local values, confirm Supabase Auth URL settings include http://localhost:5173, disable strict ad/tracker blockers for localhost, then restart npm run dev.',
        }
      }

      return { ok: false, error: text }
    }
  }

  const signOut = async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  }

  return {
    session,
    email,
    setEmail,
    sendMagicLink,
    signOut,
  }
}
