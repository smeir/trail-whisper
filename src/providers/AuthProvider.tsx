import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const previousUserId = useRef<string | null>(null)

  const user = session?.user ?? null

  // Query keys are not scoped by user and the client outlives a sign-out, so
  // without this the next account signed in on this tab renders the previous
  // one's cached activities until they go stale. RLS keeps the data safe on the
  // server; this is what keeps it off the screen.
  useEffect(() => {
    const nextUserId = user?.id ?? null
    if (previousUserId.current === nextUserId) return

    const hadUser = previousUserId.current !== null
    previousUserId.current = nextUserId
    if (hadUser) queryClient.clear()
  }, [queryClient, user?.id])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Ignore sign-out errors; local state is cleared below.
      }
    } finally {
      setSession(null)
      setLoading(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signOut,
    }),
    [loading, session, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
