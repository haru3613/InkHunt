import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import {
  validateUploadRequest,
  createSignedUploadUrl,
} from '@/lib/upload/storage'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body: unknown = await request.json()
    const validation = validateUploadRequest(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { bucket, filename, content_type } = validation.data
    const result = await createSignedUploadUrl(
      bucket,
      user.lineUserId,
      filename,
      content_type,
    )
    return NextResponse.json(result)
  } catch (err) {
    return handleApiError(err)
  }
}
