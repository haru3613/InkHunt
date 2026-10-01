import { NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    const artist = await getArtistForUser(user.lineUserId)

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('portfolio_items')
      .select('*')
      .eq('artist_id', artist.id)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [], {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
