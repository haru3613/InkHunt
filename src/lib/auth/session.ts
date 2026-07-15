/**
 * Node AuthSession adapter — current / require / requireAdmin.
 * Uses createServerClient (cookie + getUser revalidation). Not Edge-safe.
 *
 * Pure policy lives in identity.ts + admin.ts; this module only does IO.
 */
import { createServerClient } from '@/lib/supabase/server'
import { extractAuthUser, type AuthUser } from '@/lib/auth/identity'
import { isAdmin } from '@/lib/auth/admin'

/**
 * Current signed-in user, or null.
 * getUser() revalidates with Auth server; never use getSession() alone (HAR-661).
 */
export async function current(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return extractAuthUser(user)
}

/** @deprecated Prefer `current` — alias for gradual migration. */
export const getCurrentUser = current

/** Require a signed-in user with valid LINE identity in app_metadata. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await current()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

/** Require signed-in admin (ADMIN_LINE_USER_IDS). */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!isAdmin(user.lineUserId)) throw new Error('FORBIDDEN')
  return user
}
