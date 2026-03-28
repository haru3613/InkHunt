import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
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

    const { quoteRequest, inquiries } = await createQuoteRequest(
      user.lineUserId,
      user.displayName,
      validation.data,
    )

    // Fire-and-forget LINE notifications for each inquiry
    for (const inquiry of inquiries) {
      pushNewInquiryNotification(inquiry).catch(() => {
        // LINE notification failure is non-fatal
      })
    }

    return NextResponse.json({ id: quoteRequest.id, inquiryCount: inquiries.length }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
