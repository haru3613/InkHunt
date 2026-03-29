import { NextResponse } from 'next/server'
import { getCurrentUser, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null, artist: null })

  const artist = await getArtistForUser(user.lineUserId)

  let portfolioCount = 0
  if (artist) {
    const supabase = await createServerClient()
    const { count } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
    portfolioCount = count ?? 0

    // Sync LINE profile picture to artist avatar if not set
    if (!artist.avatar_url && user.avatarUrl) {
      const admin = createAdminClient()
      await admin
        .from('artists')
        .update({ avatar_url: user.avatarUrl })
        .eq('id', artist.id)
      artist.avatar_url = user.avatarUrl
    }
  }

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
          price_min: artist.price_min,
          portfolio_count: portfolioCount,
        }
      : null,
  })
}
