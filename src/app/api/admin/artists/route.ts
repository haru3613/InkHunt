import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data: artists, error } = await admin
      .from('artists')
      .select('*, artist_styles(style_id, styles(*))')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (artists ?? []).map((artist) => {
      const styles = (artist.artist_styles as unknown as Array<{ styles: unknown }>)?.map(
        (as) => as.styles,
      ) ?? []
      return { ...artist, styles, artist_styles: undefined }
    })

    return NextResponse.json({ data: enriched, total: enriched.length })
  } catch (err) {
    return handleApiError(err)
  }
}
