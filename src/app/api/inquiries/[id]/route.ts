import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById, updateInquiryStatus } from '@/lib/supabase/queries/inquiries'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const inquiry = await getInquiryById(id)

    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })

    const artist = await getArtistForUser(user.lineUserId)
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const isArtist = artist !== null && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerClient()
    const { data: artistData } = await supabase
      .from('artists')
      .select('id, slug, display_name, avatar_url')
      .eq('id', inquiry.artist_id)
      .single()

    return NextResponse.json({ inquiry, artist: artistData })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const inquiry = await getInquiryById(id)

    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })

    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const artist = await getArtistForUser(user.lineUserId)
    const isArtist = artist !== null && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (body.status === 'closed') {
      const updated = await updateInquiryStatus(id, 'closed')
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
