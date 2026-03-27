import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import { getMessagesByInquiry, sendMessage, markMessagesAsRead } from '@/lib/supabase/queries/messages'
import { pushNewMessageNotification } from '@/lib/line/messaging'
import { z } from 'zod'

const sendMessageSchema = z.object({
  message_type: z.enum(['text', 'image']),
  content: z.string().min(1).max(2000),
})

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

    const messages = await getMessagesByInquiry(id)
    const myType = isArtist ? 'artist' as const : 'consumer' as const
    await markMessagesAsRead(id, user.lineUserId, myType)

    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validation = sendMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })

    const artist = await getArtistForUser(user.lineUserId)
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const isArtist = artist !== null && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const senderType = isArtist ? 'artist' as const : 'consumer' as const
    const message = await sendMessage(
      id, senderType, user.lineUserId, validation.data.message_type, validation.data.content,
    )

    pushNewMessageNotification(inquiry, message, senderType, user.displayName).catch(
      (notifyErr) => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to send message notification:', notifyErr)
        }
      },
    )

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Send message error:', err)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
