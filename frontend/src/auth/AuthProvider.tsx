import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '../lib/supabaseClient'
import { AuthContext, type AuthContextValue } from './authContext'

function toEmail(identifier: string) {
  const trimmed = identifier.trim()
  return trimmed.includes('@') ? trimmed : `${trimmed}@bmscontracting.com`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let isMounted = true

    try {
      const supabase = getSupabaseBrowserClient()

      supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (!isMounted) {
            return
          }

          if (sessionError) {
            setError(sessionError.message)
          }

          setUser(data.session?.user ?? null)
        })
        .catch((sessionError: unknown) => {
          if (isMounted) {
            setError(
              sessionError instanceof Error
                ? sessionError.message
                : 'Session could not be loaded',
            )
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false)
          }
        })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        setError(undefined)
      })

      return () => {
        isMounted = false
        subscription.unsubscribe()
      }
    } catch (configurationError) {
      setError(
        configurationError instanceof Error
          ? configurationError.message
          : 'Supabase Auth is not configured',
      )
      setIsLoading(false)
      return undefined
    }
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    setError(undefined)
    const supabase = getSupabaseBrowserClient()
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: toEmail(identifier),
        password,
      })

    if (signInError) {
      setError('Email or password is incorrect.')
      throw signInError
    }

    setUser(data.user)
  }, [])

  const signOut = useCallback(async () => {
    setError(undefined)
    const supabase = getSupabaseBrowserClient()
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setError(signOutError.message)
      throw signOutError
    }

    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isLoading,
      signIn,
      signOut,
      user,
    }),
    [error, isLoading, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
