import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authorizeInquiryAccess, handleApiError } from '@/lib/auth/helpers'
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

    const { isArtist } = await authorizeInquiryAccess(user, inquiry)

    const myType = isArtist ? 'artist' as const : 'consumer' as const
    const [messages] = await Promise.all([
      getMessagesByInquiry(id),
      markMessagesAsRead(id, user.lineUserId, myType),
    ])

    return NextResponse.json({ messages })
  } catch (err) {
    return handleApiError(err)
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

    const { isArtist } = await authorizeInquiryAccess(user, inquiry)

    const senderType = isArtist ? 'artist' as const : 'consumer' as const
    const message = await sendMessage(
      id, senderType, user.lineUserId, validation.data.message_type, validation.data.content,
    )

    pushNewMessageNotification(inquiry, message, senderType, user.displayName).catch(() => {
      // LINE notification failure is non-fatal
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
