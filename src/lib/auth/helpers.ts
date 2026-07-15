import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { reportError } from '@/lib/observability'
import type { Artist, Inquiry } from '@/types/database'
import type { AuthUser } from '@/lib/auth/identity'

// --- Re-exports: pure identity + admin policy (Edge-safe) ---
export type { AuthUser } from '@/lib/auth/identity'
export { buildAppMetadata, extractAuthUser } from '@/lib/auth/identity'
export { isAdmin } from '@/lib/auth/admin'

// --- Re-exports: Node session adapter ---
export {
  current,
  getCurrentUser,
  requireAuth,
  requireAdmin,
} from '@/lib/auth/session'

/**
 * Domain helper: Artist row for a LINE user (not session itself).
 * Stays here until Artist profile read is deepened separately.
 */
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
