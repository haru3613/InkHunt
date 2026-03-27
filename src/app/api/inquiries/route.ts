import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import {
  validateInquiryCreate,
  createInquiry,
  getInquiriesForArtist,
  getInquiriesForConsumer,
} from '@/lib/supabase/queries/inquiries'
import { pushNewInquiryNotification } from '@/lib/line/messaging'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateInquiryCreate(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { inquiry } = await createInquiry(user.lineUserId, user.displayName, validation.data)

    pushNewInquiryNotification(inquiry).catch((err) =>
      console.error('Failed to send LINE notification:', err),
    )

    return NextResponse.json({ id: inquiry.id }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const params = request.nextUrl.searchParams
    const role = params.get('role') ?? 'consumer'
    const statusParam = params.get('status')
    const validStatuses = ['pending', 'quoted', 'accepted', 'closed'] as const
    const status = statusParam && validStatuses.includes(statusParam as typeof validStatuses[number])
      ? (statusParam as typeof validStatuses[number])
      : undefined
    const page = Number(params.get('page') ?? '1')

    if (role === 'artist') {
      const artist = await getArtistForUser(user.lineUserId)
      if (!artist) return NextResponse.json({ error: 'Not an artist' }, { status: 403 })
      const result = await getInquiriesForArtist(artist.id, status, page)
      return NextResponse.json(result)
    }

    const result = await getInquiriesForConsumer(user.lineUserId, page)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List inquiries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
