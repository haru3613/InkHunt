import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth BEFORE importing route handlers
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  handleApiError: vi.fn().mockImplementation((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
}))

vi.mock('@/lib/supabase/queries/favorites', () => ({
  removeFavorite: vi.fn(),
}))

import { DELETE } from '../route'
import { requireAuth } from '@/lib/auth/helpers'
import { removeFavorite } from '@/lib/supabase/queries/favorites'

const mockRequireAuth = vi.mocked(requireAuth)
const mockRemoveFavorite = vi.mocked(removeFavorite)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

const VALID_ARTIST_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(method: string, url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method } as never)
}

function paramsFor(artistId: string) {
  return { params: Promise.resolve({ artistId }) }
}

describe('DELETE /api/favorites/[artistId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('DELETE', `/api/favorites/${VALID_ARTIST_ID}`)
    const res = await DELETE(req, paramsFor(VALID_ARTIST_ID))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(mockRemoveFavorite).not.toHaveBeenCalled()
  })

  it('calls removeFavorite scoped to the authed consumer and artistId, returns 204', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockRemoveFavorite.mockResolvedValueOnce(undefined)

    const req = makeRequest('DELETE', `/api/favorites/${VALID_ARTIST_ID}`)
    const res = await DELETE(req, paramsFor(VALID_ARTIST_ID))

    expect(res.status).toBe(204)
    expect(mockRemoveFavorite).toHaveBeenCalledWith('Uconsumer123', VALID_ARTIST_ID)
  })
})
