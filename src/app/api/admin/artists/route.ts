import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { flattenArtistStyles } from '@/lib/supabase/transforms'

export async function GET() {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data: artists, error } = await admin
      .from('artists')
      .select('*, artist_styles(style_id, styles(*))')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to load artists' }, { status: 500 })
    }

    const enriched = (artists ?? []).map((artist) => ({
      ...artist,
      styles: flattenArtistStyles(artist.artist_styles),
      artist_styles: undefined,
    }))

    return NextResponse.json({ data: enriched, total: enriched.length })
  } catch (err) {
    return handleApiError(err)
  }
}
