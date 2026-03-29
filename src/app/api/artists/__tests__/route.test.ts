import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all dependencies BEFORE importing route handlers
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

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtists: vi.fn(),
}))

import { POST, GET } from '../route'
import { requireAuth } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { getArtists } from '@/lib/supabase/queries/artists'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

const mockUser = {
  supabaseId: 'supabase-uuid-123',
  lineUserId: 'U1234567890',
  displayName: 'Test Artist',
  avatarUrl: null,
}

describe('POST /api/artists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('UNAUTHORIZED'))

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      display_name: '測試刺青師',
      city: '台北市',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when validation fails (missing required fields)', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      bio: 'Missing display_name and city',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 400 when display_name is empty string', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      display_name: '',
      city: '台北市',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
    expect(body.details.display_name).toBeDefined()
  })

  it('returns 201 and creates artist with generated slug', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)

    const mockArtist = {
      id: 'artist-uuid-1',
      slug: 'test-artist-abc123',
      display_name: '測試刺青師',
      city: '台北市',
      line_user_id: 'U1234567890',
      status: 'pending',
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtist, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsertArtist = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsertArtist })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      display_name: '測試刺青師',
      city: '台北市',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.id).toBe('artist-uuid-1')
    expect(body.status).toBe('pending')

    // Verify insert was called with correct fields
    const insertCall = mockInsertArtist.mock.calls[0][0]
    expect(insertCall.display_name).toBe('測試刺青師')
    expect(insertCall.city).toBe('台北市')
    expect(insertCall.line_user_id).toBe('U1234567890')
    expect(insertCall.status).toBe('pending')
    // Slug preserves CJK characters and appends a base-36 timestamp
    expect(insertCall.slug).toMatch(/^測試刺青師-[a-z0-9]+$/)
  })

  it('inserts style associations when style_ids provided', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)

    const mockArtist = {
      id: 'artist-uuid-2',
      slug: 'ink-master-abc123',
      display_name: 'Ink Master',
      city: '新北市',
      status: 'pending',
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtist, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsertArtist = vi.fn().mockReturnValue({ select: mockSelect })
    const mockInsertStyles = vi.fn().mockResolvedValue({ error: null })

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'artists') return { insert: mockInsertArtist }
      if (table === 'artist_styles') return { insert: mockInsertStyles }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      display_name: 'Ink Master',
      city: '新北市',
      style_ids: [1, 3],
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockInsertStyles).toHaveBeenCalledWith([
      { artist_id: 'artist-uuid-2', style_id: 1 },
      { artist_id: 'artist-uuid-2', style_id: 3 },
    ])
  })

  it('does not insert artist_styles when style_ids is empty', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)

    const mockArtist = { id: 'artist-uuid-3', slug: 'no-styles-abc123', display_name: 'No Styles', city: '高雄市', status: 'pending' }
    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtist, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsertArtist = vi.fn().mockReturnValue({ select: mockSelect })
    const mockInsertStyles = vi.fn()
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'artists') return { insert: mockInsertArtist }
      if (table === 'artist_styles') return { insert: mockInsertStyles }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const request = makeRequest('POST', 'http://localhost:3000/api/artists', {
      display_name: 'No Styles',
      city: '高雄市',
      style_ids: [],
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockInsertStyles).not.toHaveBeenCalled()
  })
})

describe('GET /api/artists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with default pagination when no query params', async () => {
    const mockResult = {
      data: [
        { id: 'a1', slug: 'artist-one', display_name: '刺青師甲', city: '台北市', styles: [], portfolio_items: [] },
        { id: 'a2', slug: 'artist-two', display_name: '刺青師乙', city: '台中市', styles: [], portfolio_items: [] },
      ],
      total: 2,
    }
    vi.mocked(getArtists).mockResolvedValue(mockResult)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(vi.mocked(getArtists)).toHaveBeenCalledWith({
      style: undefined,
      city: undefined,
      page: undefined,
      pageSize: undefined,
    })
  })

  it('passes style filter to getArtists', async () => {
    vi.mocked(getArtists).mockResolvedValue({ data: [], total: 0 })

    const request = makeRequest('GET', 'http://localhost:3000/api/artists?style=fine-line')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(getArtists)).toHaveBeenCalledWith(
      expect.objectContaining({ style: 'fine-line' }),
    )
    expect(body.total).toBe(0)
  })

  it('passes city filter to getArtists', async () => {
    const mockResult = {
      data: [{ id: 'a3', slug: 'taipei-artist', display_name: '台北刺青師', city: '台北市', styles: [], portfolio_items: [] }],
      total: 1,
    }
    vi.mocked(getArtists).mockResolvedValue(mockResult)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists?city=台北市')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(getArtists)).toHaveBeenCalledWith(
      expect.objectContaining({ city: '台北市' }),
    )
    expect(body.data[0].city).toBe('台北市')
  })

  it('passes pagination params to getArtists', async () => {
    vi.mocked(getArtists).mockResolvedValue({ data: [], total: 50 })

    const request = makeRequest('GET', 'http://localhost:3000/api/artists?page=2&pageSize=10')

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(vi.mocked(getArtists)).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 }),
    )
  })
})
