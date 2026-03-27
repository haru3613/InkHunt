import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import {
  validateQuoteCreate,
  createQuote,
  respondToQuote,
} from '@/lib/supabase/queries/quotes'
import { pushQuoteNotification } from '@/lib/line/messaging'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validation = validateQuoteCreate(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || inquiry.artist_id !== artist.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { quote, message } = await createQuote(
      id,
      artist.id,
      user.lineUserId,
      validation.data,
    )

    pushQuoteNotification(inquiry, quote, artist.display_name).catch((err) =>
      console.error('Failed to send quote notification:', err),
    )

    return NextResponse.json({ quote, message }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create quote error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
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
    const { quote_id, status } = body

    if (!quote_id || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    if (inquiry.consumer_line_id !== user.lineUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const quote = await respondToQuote(quote_id, id, status)
    return NextResponse.json(quote)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Respond to quote error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
