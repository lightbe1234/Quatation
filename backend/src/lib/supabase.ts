import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from '../config/env.js'

let client: SupabaseClient | undefined

export function getSupabaseClient() {
  if (!client) {
    const config = requireSupabaseEnv()

    client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return client
}
