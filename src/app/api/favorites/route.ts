import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { getFavoriteArtists, addFavorite } from '@/lib/supabase/queries/favorites'
import { favoriteInputSchema } from '@/lib/validations/favorite'

export async function GET() {
  try {
    const user = await requireAuth()
    const artists = await getFavoriteArtists(user.lineUserId)
    return NextResponse.json(artists)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = favoriteInputSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    await addFavorite(user.lineUserId, validation.data.artistId)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
