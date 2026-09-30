import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  handleApiError: vi.fn((error: unknown) => {
    const status = error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500
    return Response.json({ error: status === 401 ? 'Unauthorized' : 'Internal server error' }, { status })
  }),
}))
vi.mock('@/lib/upload/inquiry-media-server', () => ({
  canReadInquiryMedia: vi.fn(),
  createSignedInquiryMediaReadUrl: vi.fn(),
}))

import { GET } from '../route'
import { requireAuth } from '@/lib/auth/helpers'
import {
  canReadInquiryMedia,
  createSignedInquiryMediaReadUrl,
} from '@/lib/upload/inquiry-media-server'

const UID = '00000000-0000-4000-8000-000000000001'
const OBJECT = '123e4567-e89b-12d3-a456-426614174000.jpg'
const authUser = {
  supabaseId: UID,
  lineUserId: 'U-user',
  displayName: 'User',
  avatarUrl: null,
}

function request() {
  return new NextRequest(`http://localhost:3000/api/media/inquiries/${UID}/${OBJECT}`)
}

function context(path = [UID, OBJECT]) {
  return { params: Promise.resolve({ path }) }
}

describe('GET /api/media/inquiries/[...path]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 with private no-store for an unauthenticated request', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('UNAUTHORIZED'))
    const response = await GET(request(), context())
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('returns 403 without issuing a signed URL for an authenticated non-participant', async () => {
    vi.mocked(requireAuth).mockResolvedValue(authUser)
    vi.mocked(canReadInquiryMedia).mockResolvedValue(false)
    const response = await GET(request(), context())
    expect(response.status).toBe(403)
    expect(createSignedInquiryMediaReadUrl).not.toHaveBeenCalled()
  })

  it('redirects an authorized participant to a short-lived server-issued URL', async () => {
    vi.mocked(requireAuth).mockResolvedValue(authUser)
    vi.mocked(canReadInquiryMedia).mockResolvedValue(true)
    vi.mocked(createSignedInquiryMediaReadUrl).mockResolvedValue(
      'https://project.supabase.co/storage/v1/object/sign/inquiries/object?token=server-token',
    )
    const response = await GET(request(), context())
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('token=server-token')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects malformed multi-segment paths before authorization', async () => {
    vi.mocked(requireAuth).mockResolvedValue(authUser)
    const response = await GET(request(), context([UID, 'nested', OBJECT]))
    expect(response.status).toBe(404)
    expect(canReadInquiryMedia).not.toHaveBeenCalled()
  })
})
