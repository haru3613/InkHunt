import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { reportError } from '@/lib/observability'
import type { Artist, Inquiry } from '@/types/database'

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

export function extractAuthUser(user: User | null): AuthUser | null {
  if (!user) return null

  // Identity MUST come from app_metadata: only the service role can write it.
  // user_metadata is editable by any logged-in user via auth.updateUser(),
  // so trusting it for line_user_id allows account takeover (HAR-661).
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  // getUser() revalidates the token with the Auth server; getSession() only
  // decodes the cookie client-side and can be forged (HAR-661).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return extractAuthUser(user)
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function getArtistForUser(
  lineUserId: string,
): Promise<Artist | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('artists')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single()
  return data
}

export function isAdmin(lineUserId: string): boolean {
  const adminIds = (process.env.ADMIN_LINE_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return adminIds.includes(lineUserId)
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!isAdmin(user.lineUserId)) throw new Error('FORBIDDEN')
  return user
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error && err.message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (err instanceof Error && err.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  reportError('api', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function authorizeInquiryAccess(
  user: AuthUser,
  inquiry: Inquiry,
): Promise<{ isConsumer: boolean; isArtist: boolean; artist: Artist | null }> {
  const artist = await getArtistForUser(user.lineUserId)
  const isConsumer = inquiry.consumer_line_id === user.lineUserId
  const isArtist = artist !== null && inquiry.artist_id === artist.id
  if (!isConsumer && !isArtist) throw new Error('FORBIDDEN')
  return { isConsumer, isArtist, artist }
}
