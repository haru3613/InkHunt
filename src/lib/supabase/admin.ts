import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createAdminClient } from './server'
import { reportError } from '@/lib/observability'

/**
 * Build an admin Supabase client, returning `null` instead of throwing when
 * the service-role env is absent. Keeps public read paths null-tolerant so a
 * misconfigured/build-time environment degrades to empty results instead of
 * crashing server-rendered pages. Lives in its own module (not server.ts) so
 * tests can mock `createAdminClient` across the import boundary.
 */
export function safeAdminClient(): SupabaseClient<Database> | null {
  try {
    return createAdminClient()
  } catch (err) {
    reportError('supabase-admin', err)
    return null
  }
}
