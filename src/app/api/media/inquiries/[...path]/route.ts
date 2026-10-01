import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, requireAuth } from '@/lib/auth/helpers'
import {
  parseInquiryMediaPath,
} from '@/lib/upload/inquiry-media'
import {
  canReadInquiryMedia,
  createSignedInquiryMediaReadUrl,
} from '@/lib/upload/inquiry-media-server'

const PRIVATE_NO_STORE = 'private, no-store, max-age=0'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const user = await requireAuth()
    const { path: segments } = await params
    const objectPath = parseInquiryMediaPath(`/api/media/inquiries/${segments.join('/')}`)
    if (!objectPath) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404, headers: { 'Cache-Control': PRIVATE_NO_STORE } },
      )
    }

    if (!(await canReadInquiryMedia(user, objectPath))) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: { 'Cache-Control': PRIVATE_NO_STORE } },
      )
    }

    const signedUrl = await createSignedInquiryMediaReadUrl(objectPath)
    const response = NextResponse.redirect(signedUrl, 307)
    response.headers.set('Cache-Control', PRIVATE_NO_STORE)
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch (error) {
    const response = handleApiError(error)
    response.headers.set('Cache-Control', PRIVATE_NO_STORE)
    return response
  }
}
