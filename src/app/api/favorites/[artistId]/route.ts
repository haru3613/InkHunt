import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { removeFavorite } from '@/lib/supabase/queries/favorites'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> },
) {
  try {
    const user = await requireAuth()
    const { artistId } = await params
    // Single-row delete scoped to BOTH the authed consumer and the artist —
    // never a bulk delete (removeFavorite filters on both keys).
    await removeFavorite(user.lineUserId, artistId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return handleApiError(err)
  }
}
