import { NextResponse } from 'next/server'
import type { Session } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { Artist, Inquiry } from '@/types/database'

export interface AuthUser {
  supabaseId: string
  lineUserId: string
  displayName: string
  avatarUrl: string | null
}

export function extractUserFromSession(
  session: Session | null,
): AuthUser | null {
  if (!session?.user) return null

  const meta = session.user.user_metadata
  return {
    supabaseId: session.user.id,
    lineUserId: meta.sub ?? meta.provider_id ?? '',
    displayName: meta.name ?? meta.full_name ?? '',
    avatarUrl: meta.picture ?? meta.avatar_url ?? null,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return extractUserFromSession(session)
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
  const adminIds = (process.env.ADMIN_LINE_USER_IDS ?? '').split(',').filter(Boolean)
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
