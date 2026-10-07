import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

let cached: SupabaseClient<Database> | null = null

/** Cliente server-only para dados que nunca devem ser acessíveis pelo JWT do usuário. */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SECRET_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('Backend Supabase seguro não configurado')
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

// Intentionally server-only: never import this module from client code.
