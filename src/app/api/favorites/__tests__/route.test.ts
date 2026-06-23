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
  getFavoriteArtists: vi.fn(),
  addFavorite: vi.fn(),
}))

import { GET, POST } from '../route'
import { requireAuth } from '@/lib/auth/helpers'
import { getFavoriteArtists, addFavorite } from '@/lib/supabase/queries/favorites'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetFavoriteArtists = vi.mocked(getFavoriteArtists)
const mockAddFavorite = vi.mocked(addFavorite)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

// Valid RFC-4122 v4 UUID (variant 8). An all-1s placeholder would fail z.uuid().
const VALID_ARTIST_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

describe('GET /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const res = await GET()

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns the favorited artists for the authed lineUserId', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetFavoriteArtists.mockResolvedValueOnce([
      { id: 'artist-1', slug: 'a-one' } as never,
      { id: 'artist-2', slug: 'a-two' } as never,
    ])

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('artist-1')
    expect(mockGetFavoriteArtists).toHaveBeenCalledWith('Uconsumer123')
  })
})

describe('POST /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('POST', '/api/favorites', { artistId: VALID_ARTIST_ID })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when body is invalid (not a uuid)', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)

    const req = makeRequest('POST', '/api/favorites', { artistId: 'not-a-uuid' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(mockAddFavorite).not.toHaveBeenCalled()
  })

  it('returns 400 when artistId is missing', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)

    const req = makeRequest('POST', '/api/favorites', {})
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(mockAddFavorite).not.toHaveBeenCalled()
  })

  it('calls addFavorite with authed lineUserId and returns 201 on valid uuid', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockAddFavorite.mockResolvedValueOnce(undefined)

    const req = makeRequest('POST', '/api/favorites', { artistId: VALID_ARTIST_ID })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockAddFavorite).toHaveBeenCalledWith('Uconsumer123', VALID_ARTIST_ID)
  })
})
