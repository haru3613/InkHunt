import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Use vi.hoisted so mock functions are available inside vi.mock factory closures
const { mockRequireAuth, mockHandleApiError, mockGetQuoteRequestWithQuotes } =
  vi.hoisted(() => ({
    mockRequireAuth: vi.fn(),
    mockHandleApiError: vi.fn(),
    mockGetQuoteRequestWithQuotes: vi.fn(),
  }))

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}))

vi.mock('@/lib/supabase/queries/quote-requests', () => ({
  getQuoteRequestWithQuotes: mockGetQuoteRequestWithQuotes,
}))

import { GET } from '../route'

function makeRequest(method: string, url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method })
}

// Next.js 15+: params is a Promise
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

const mockUser = {
  supabaseId: 'sup-123',
  lineUserId: 'U_consumer_line_id',
  displayName: 'Test Consumer',
  avatarUrl: null,
}

const mockQuoteRequestResult = {
  quoteRequest: {
    id: 'qr-abc-123',
    consumer_line_id: 'U_consumer_line_id',
    consumer_name: 'Test Consumer',
    description: 'I want a traditional sleeve on my left arm.',
    reference_images: [],
    body_part: 'left arm',
    size_estimate: '30cm',
    budget_min: 5000,
    budget_max: 15000,
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
  },
  inquiries: [
    {
      id: 'inq-1',
      artist_id: 'artist-uuid-1',
      artist: {
        id: 'artist-uuid-1',
        slug: 'test-artist',
        display_name: 'Test Artist',
        avatar_url: null,
        city: '台北市',
      },
      quotes: [],
    },
  ],
}

describe('GET /api/quote-requests/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleApiError.mockImplementation((err: unknown) => {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

    const request = makeRequest('GET', 'http://localhost:3000/api/quote-requests/qr-abc-123')
    const response = await GET(request, makeParams('qr-abc-123'))

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns 404 when quote request does not exist', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockGetQuoteRequestWithQuotes.mockResolvedValue(null)

    const request = makeRequest('GET', 'http://localhost:3000/api/quote-requests/nonexistent-id')
    const response = await GET(request, makeParams('nonexistent-id'))

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json).toEqual({ error: 'Quote request not found' })
  })

  it('returns 403 when authenticated user is not the quote request consumer', async () => {
    mockRequireAuth.mockResolvedValue({ ...mockUser, lineUserId: 'U_different_user' })
    mockGetQuoteRequestWithQuotes.mockResolvedValue(mockQuoteRequestResult)

    const request = makeRequest('GET', 'http://localhost:3000/api/quote-requests/qr-abc-123')
    const response = await GET(request, makeParams('qr-abc-123'))

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json).toEqual({ error: 'Forbidden' })
  })

  it('returns 200 with full data when consumer accesses their own quote request', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockGetQuoteRequestWithQuotes.mockResolvedValue(mockQuoteRequestResult)

    const request = makeRequest('GET', 'http://localhost:3000/api/quote-requests/qr-abc-123')
    const response = await GET(request, makeParams('qr-abc-123'))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.quoteRequest.id).toBe('qr-abc-123')
    expect(json.quoteRequest.consumer_line_id).toBe('U_consumer_line_id')
    expect(json.inquiries).toHaveLength(1)
    expect(json.inquiries[0].artist.display_name).toBe('Test Artist')
  })

  it('passes the resolved id param to the query function', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockGetQuoteRequestWithQuotes.mockResolvedValue(mockQuoteRequestResult)

    const request = makeRequest('GET', 'http://localhost:3000/api/quote-requests/qr-abc-123')
    await GET(request, makeParams('qr-abc-123'))

    expect(mockGetQuoteRequestWithQuotes).toHaveBeenCalledWith('qr-abc-123')
  })
})
