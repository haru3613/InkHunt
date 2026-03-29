import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth BEFORE importing route handlers
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  getArtistForUser: vi.fn(),
  handleApiError: vi.fn().mockImplementation((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

import { GET, POST } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockCreateServerClient = vi.mocked(createServerClient)
const mockCreateAdminClient = vi.mocked(createAdminClient)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-artist',
  lineUserId: 'Uartist123',
  displayName: '測試刺青師',
  avatarUrl: null,
}

const MOCK_ARTIST = {
  id: 'artist-uuid-1',
  slug: 'test-artist',
  display_name: '測試刺青師',
  line_user_id: 'Uartist123',
}

const MOCK_PORTFOLIO_ITEMS = [
  {
    id: 'item-uuid-1',
    artist_id: 'artist-uuid-1',
    image_url: 'https://example.com/image1.jpg',
    sort_order: 0,
    title: '玫瑰刺青',
  },
  {
    id: 'item-uuid-2',
    artist_id: 'artist-uuid-1',
    image_url: 'https://example.com/image2.jpg',
    sort_order: 1,
    title: '幾何圖案',
  },
]

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

// Build a chainable Supabase query builder mock
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain
}

describe('GET /api/artists/[slug]/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when artist is not found', async () => {
    const artistChain = makeQueryBuilder({ data: null, error: null })
    mockCreateServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(artistChain),
    } as never)

    const req = makeRequest('GET', '/api/artists/nonexistent/portfolio')
    const res = await GET(req, makeParams('nonexistent'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Artist not found')
  })

  it('returns 200 with portfolio items sorted by sort_order', async () => {
    const artistChain = makeQueryBuilder({ data: { id: 'artist-uuid-1' }, error: null })
    const portfolioChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: MOCK_PORTFOLIO_ITEMS, error: null }),
    }

    const fromMock = vi.fn()
      .mockReturnValueOnce(artistChain)   // first call: artists table
      .mockReturnValueOnce(portfolioChain) // second call: portfolio_items table

    mockCreateServerClient.mockResolvedValue({
      from: fromMock,
    } as never)

    const req = makeRequest('GET', '/api/artists/test-artist/portfolio')
    const res = await GET(req, makeParams('test-artist'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0].id).toBe('item-uuid-1')
    expect(body[1].id).toBe('item-uuid-2')
    expect(portfolioChain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
  })

  it('returns 500 when portfolio query errors', async () => {
    const artistChain = makeQueryBuilder({ data: { id: 'artist-uuid-1' }, error: null })
    const portfolioChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }

    const fromMock = vi.fn()
      .mockReturnValueOnce(artistChain)
      .mockReturnValueOnce(portfolioChain)

    mockCreateServerClient.mockResolvedValue({
      from: fromMock,
    } as never)

    const req = makeRequest('GET', '/api/artists/test-artist/portfolio')
    const res = await GET(req, makeParams('test-artist'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('DB error')
  })
})

describe('POST /api/artists/[slug]/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'https://example.com/image.jpg',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when request body fails validation', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'not-a-valid-url',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 403 when authenticated user does not own the artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce({
      ...MOCK_ARTIST,
      slug: 'different-artist',
    } as never)

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'https://example.com/image.jpg',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'https://example.com/image.jpg',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 201 with created item and auto-assigned sort_order', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const maxOrderChain = makeQueryBuilder({ data: { sort_order: 2 }, error: null })
    const insertChain = makeQueryBuilder({
      data: {
        id: 'item-uuid-new',
        artist_id: 'artist-uuid-1',
        image_url: 'https://example.com/new.jpg',
        sort_order: 3,
      },
      error: null,
    })

    const adminFromMock = vi.fn()
      .mockReturnValueOnce(maxOrderChain) // max sort_order query
      .mockReturnValueOnce(insertChain)   // insert query

    mockCreateAdminClient.mockReturnValue({
      from: adminFromMock,
    } as never)

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'https://example.com/new.jpg',
      title: '新作品',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('item-uuid-new')
    expect(body.sort_order).toBe(3)
  })

  it('assigns sort_order 0 when artist has no existing portfolio items', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    // no existing items: single() returns null
    const maxOrderChain = makeQueryBuilder({ data: null, error: null })
    const insertChain = makeQueryBuilder({
      data: {
        id: 'item-uuid-first',
        artist_id: 'artist-uuid-1',
        image_url: 'https://example.com/first.jpg',
        sort_order: 0,
      },
      error: null,
    })

    const adminFromMock = vi.fn()
      .mockReturnValueOnce(maxOrderChain)
      .mockReturnValueOnce(insertChain)

    mockCreateAdminClient.mockReturnValue({
      from: adminFromMock,
    } as never)

    const req = makeRequest('POST', '/api/artists/test-artist/portfolio', {
      image_url: 'https://example.com/first.jpg',
    })
    const res = await POST(req, makeParams('test-artist'))

    expect(res.status).toBe(201)
    // sort_order = (-1 + 1) = 0; the insert chain resolves with sort_order 0
    const body = await res.json()
    expect(body.sort_order).toBe(0)

    // Verify the insert was called with sort_order: 0
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 0 }),
    )
  })
})
