import type { User } from '@supabase/supabase-js'

/**
 * Edge-safe identity types + pure extractors (HAR-661).
 * No Node / Supabase client imports — safe for middleware.
 */

export interface AuthUser {
  supabaseId: string
  lineUserId: string
  displayName: string
  avatarUrl: string | null
}

// Identity lives in app_metadata (service-role-only writable); user_metadata
// is client-editable and must never be the source of truth (HAR-661).
export function buildAppMetadata(lineUserId: string) {
  return { line_user_id: lineUserId, provider: 'line' }
}

/**
 * Map a Supabase Auth user to AuthUser.
 * Returns null when app_metadata.line_user_id is missing (treat as unauthenticated
 * for identity purposes — never fall back to user_metadata).
 */
export function extractAuthUser(user: User | null): AuthUser | null {
  if (!user) return null

  const lineUserId = user.app_metadata?.line_user_id
  if (typeof lineUserId !== 'string' || lineUserId === '') return null

  const meta = user.user_metadata ?? {}
  return {
    supabaseId: user.id,
    lineUserId,
    displayName: meta.name ?? meta.full_name ?? '',
    avatarUrl: meta.picture ?? meta.avatar_url ?? null,
  }
}
