import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { getQuoteRequestWithQuotes } from '@/lib/supabase/queries/quote-requests'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const result = await getQuoteRequestWithQuotes(id)

    if (!result) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 })
    }

    if (result.quoteRequest.consumer_line_id !== user.lineUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return handleApiError(err)
  }
}
