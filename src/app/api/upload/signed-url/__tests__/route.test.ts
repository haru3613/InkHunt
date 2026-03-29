import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies BEFORE imports of the module under test
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  handleApiError: vi.fn((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

vi.mock('@/lib/upload/storage', () => ({
  validateUploadRequest: vi.fn(),
  createSignedUploadUrl: vi.fn(),
}))

import { POST } from '../route'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { validateUploadRequest, createSignedUploadUrl } from '@/lib/upload/storage'

const mockRequireAuth = vi.mocked(requireAuth)
const mockHandleApiError = vi.mocked(handleApiError)
const mockValidateUploadRequest = vi.mocked(validateUploadRequest)
const mockCreateSignedUploadUrl = vi.mocked(createSignedUploadUrl)

const mockAuthUser = {
  supabaseId: 'supabase-uuid',
  lineUserId: 'U_line_user',
  displayName: '測試用戶',
  avatarUrl: null,
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

describe('POST /api/upload/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    )

    const request = makeRequest('POST', '/api/upload/signed-url', {
      bucket: 'portfolio',
      filename: 'tattoo.jpg',
      content_type: 'image/jpeg',
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(mockHandleApiError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns 400 when request body fails validation', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthUser)
    mockValidateUploadRequest.mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: { bucket: ['Invalid enum value'] },
        }),
      },
    } as never)

    const request = makeRequest('POST', '/api/upload/signed-url', {
      bucket: 'invalid-bucket',
      filename: 'test.jpg',
      content_type: 'image/jpeg',
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid request')
    expect(body.details).toBeDefined()
  })

  it('returns 200 with signed URL when request is valid', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthUser)
    mockValidateUploadRequest.mockReturnValue({
      success: true,
      data: {
        bucket: 'portfolio',
        filename: 'my-tattoo.jpg',
        content_type: 'image/jpeg',
      },
    } as never)

    const signedUrlResult = {
      signed_url: 'https://storage.example.com/portfolio/U_line_user/1234567-abc.jpg?token=xyz',
      public_url: 'https://storage.example.com/portfolio/U_line_user/1234567-abc.jpg',
      path: 'U_line_user/1234567-abc.jpg',
    }
    mockCreateSignedUploadUrl.mockResolvedValue(signedUrlResult)

    const request = makeRequest('POST', '/api/upload/signed-url', {
      bucket: 'portfolio',
      filename: 'my-tattoo.jpg',
      content_type: 'image/jpeg',
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.signed_url).toBe(signedUrlResult.signed_url)
    expect(body.public_url).toBe(signedUrlResult.public_url)
    expect(body.path).toBe(signedUrlResult.path)
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(
      'portfolio',
      'U_line_user',
      'my-tattoo.jpg',
      'image/jpeg',
    )
  })

  it('returns 500 when storage service fails to create signed URL', async () => {
    mockRequireAuth.mockResolvedValue(mockAuthUser)
    mockValidateUploadRequest.mockReturnValue({
      success: true,
      data: {
        bucket: 'portfolio',
        filename: 'test.jpg',
        content_type: 'image/jpeg',
      },
    } as never)
    mockCreateSignedUploadUrl.mockRejectedValue(
      new Error('Failed to create signed URL: storage unavailable'),
    )
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    )

    const request = makeRequest('POST', '/api/upload/signed-url', {
      bucket: 'portfolio',
      filename: 'test.jpg',
      content_type: 'image/jpeg',
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Internal server error')
    expect(mockHandleApiError).toHaveBeenCalled()
  })
})
