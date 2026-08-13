import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const hasValidSupabaseConfig =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'placeholder-key'

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Auth types
export type User = {
  id: string
  email?: string
  name?: string
  isGuest?: boolean
}

// Auth context type
export type AuthContextType = {
  user: User | null
  loading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  continueAsGuest: () => void
}
