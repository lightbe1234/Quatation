import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AuthContextValue = {
  error?: string
  isLoading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  user: User | null
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
