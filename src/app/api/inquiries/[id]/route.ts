import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authorizeInquiryAccess, handleApiError } from '@/lib/auth/helpers'
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

    await authorizeInquiryAccess(user, inquiry)

    const supabase = await createServerClient()
    const { data: artistData } = await supabase
      .from('artists')
      .select('id, slug, display_name, avatar_url')
      .eq('id', inquiry.artist_id)
      .single()

    return NextResponse.json({ inquiry, artist: artistData })
  } catch (err) {
    return handleApiError(err)
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

    await authorizeInquiryAccess(user, inquiry)

    if (body.status === 'closed') {
      const updated = await updateInquiryStatus(id, 'closed')
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
  } catch (err) {
    return handleApiError(err)
  }
}
