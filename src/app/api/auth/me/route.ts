import { NextResponse } from 'next/server'
import { getCurrentUser, getArtistForUser } from '@/lib/auth/helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null, artist: null })

  const artist = await getArtistForUser(user.lineUserId)
  return NextResponse.json({
    user: {
      lineUserId: user.lineUserId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    artist: artist
      ? {
          id: artist.id,
          slug: artist.slug,
          display_name: artist.display_name,
          status: artist.status,
        }
      : null,
  })
}
