import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth BEFORE importing route handlers (mirror inquiries/quote-requests).
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

vi.mock('@/lib/supabase/queries/reviews', () => ({
  createReview: vi.fn(),
  ReviewConflictError: class ReviewConflictError extends Error {},
  ArtistNotFoundError: class ArtistNotFoundError extends Error {},
}))

import { POST } from '../route'
import { requireAuth } from '@/lib/auth/helpers'
import {
  createReview,
  ReviewConflictError,
  ArtistNotFoundError,
} from '@/lib/supabase/queries/reviews'

const mockRequireAuth = vi.mocked(requireAuth)
const mockCreateReview = vi.mocked(createReview)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

const ARTIST_ID = '11111111-1111-4111-8111-111111111111'

function makeRequest(body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method: 'POST' }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL('/api/artists/test-artist/reviews', 'http://localhost:3000'), init as never)
}

function makeParams(slug = 'test-artist') {
  return { params: Promise.resolve({ slug }) }
}

describe('POST /api/artists/[slug]/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const res = await POST(makeRequest({ rating: 5, artistId: ARTIST_ID }), makeParams())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    // Never reach the DB when unauthenticated.
    expect(mockCreateReview).not.toHaveBeenCalled()
  })

  it('returns 400 when the body fails reviewSchema validation', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)

    // rating 0 is below the schema minimum of 1; artistId not a uuid.
    const res = await POST(makeRequest({ rating: 0, artistId: 'not-a-uuid' }), makeParams())

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
    expect(mockCreateReview).not.toHaveBeenCalled()
  })

  it('returns 201 and inserts with author_line_user_id = session user on a valid submit', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockCreateReview.mockResolvedValueOnce({
      id: 'review-uuid-new',
      artist_id: ARTIST_ID,
      author_line_user_id: MOCK_USER.lineUserId,
      rating: 5,
      comment: '很棒的體驗',
      created_at: '2026-06-13T00:00:00.000Z',
    })

    const res = await POST(
      makeRequest({ rating: 5, comment: '很棒的體驗', artistId: ARTIST_ID }),
      makeParams(),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('review-uuid-new')

    // Author id is server-derived (the session user), never client-supplied.
    expect(mockCreateReview).toHaveBeenCalledTimes(1)
    expect(mockCreateReview).toHaveBeenCalledWith(
      'test-artist',
      MOCK_USER.lineUserId,
      { rating: 5, comment: '很棒的體驗', artistId: ARTIST_ID },
    )
  })

  it('returns 404 when the artist slug does not resolve', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockCreateReview.mockRejectedValueOnce(new ArtistNotFoundError('artist not found'))

    const res = await POST(
      makeRequest({ rating: 4, artistId: ARTIST_ID }),
      makeParams('ghost-artist'),
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 409 on the duplicate-review unique violation', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockCreateReview.mockRejectedValueOnce(new ReviewConflictError('duplicate'))

    const res = await POST(
      makeRequest({ rating: 4, artistId: ARTIST_ID }),
      makeParams(),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
