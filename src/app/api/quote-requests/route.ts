import { deferLineNotification } from '@/lib/line/defer'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { isOwnedInquiryMediaUrl } from '@/lib/upload/inquiry-media'
import { quoteRequestSchema } from '@/lib/validations/quote-request'
import { createQuoteRequest } from '@/lib/supabase/queries/quote-requests'
import { pushNewInquiryNotification } from '@/lib/line/messaging'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = quoteRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    if (!validation.data.reference_images.every(url => isOwnedInquiryMediaUrl(url, user.supabaseId))) {
      return NextResponse.json({ error: 'Reference image must be your own upload' }, { status: 400 })
    }

    const { quoteRequest, inquiries } = await createQuoteRequest(
      user.lineUserId,
      user.displayName,
      validation.data,
    )

    deferLineNotification(async () => {
      await Promise.all(inquiries.map(inquiry => pushNewInquiryNotification(inquiry)))
    })

    return NextResponse.json({ id: quoteRequest.id, inquiryCount: inquiries.length }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
