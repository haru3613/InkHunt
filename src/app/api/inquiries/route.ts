import { deferLineNotification } from '@/lib/line/defer'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import {
  validateInquiryCreate,
  createInquiry,
  getInquiriesForArtist,
  getInquiriesForConsumer,
  InquiryMutationError,
} from '@/lib/supabase/queries/inquiries'
import { getUnreadCountsForUser } from '@/lib/supabase/queries/messages'
import { pushNewInquiryNotification } from '@/lib/line/messaging'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateInquiryCreate(body, user.supabaseId)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { inquiry } = await createInquiry(user.lineUserId, user.displayName, validation.data)

    deferLineNotification(() => pushNewInquiryNotification(inquiry))

    return NextResponse.json({ id: inquiry.id }, { status: 201 })
  } catch (err) {
    if (err instanceof InquiryMutationError) {
      const status = err.code === 'ARTIST_NOT_FOUND' ? 404 : 409
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      )
    }
    return handleApiError(err)
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
      const inquiryIds = (result.data ?? []).map((inq: { id: string }) => inq.id)
      const unreadCounts = await getUnreadCountsForUser(user.lineUserId, inquiryIds)
      const data = (result.data ?? []).map((inq: { id: string }) => ({
        ...inq,
        unread_count: unreadCounts.get(inq.id) ?? 0,
      }))
      return NextResponse.json({ ...result, data })
    }

    const result = await getInquiriesForConsumer(user.lineUserId, status, page)
    return NextResponse.json(result)
  } catch (err) {
    return handleApiError(err)
  }
}
