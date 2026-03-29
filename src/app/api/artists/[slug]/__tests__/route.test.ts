import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all dependencies BEFORE importing route handlers
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  getArtistForUser: vi.fn(),
  handleApiError: vi.fn((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
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
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/transforms', () => ({
  flattenArtistStyles: vi.fn((artistStyles: unknown) => {
    return (artistStyles as Array<{ styles: unknown }> | null)?.map((as) => as.styles) ?? []
  }),
}))

import { GET, PATCH } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

const mockUser = {
  supabaseId: 'supabase-uuid-123',
  lineUserId: 'U1234567890',
  displayName: 'Test Artist',
  avatarUrl: null,
}

const mockArtistRow = {
  id: 'artist-uuid-1',
  slug: 'ink-master',
  display_name: '刺青大師',
  bio: '專業刺青師，擅長極簡線條',
  city: '台北市',
  district: '大安區',
  address: '復興南路一段',
  price_min: 3000,
  price_max: 20000,
  ig_handle: 'inkmaster_tw',
  pricing_note: '依圖案複雜度估價',
  booking_notice: '請提前一週預約',
  status: 'active',
  is_claimed: true,
  featured: false,
  offers_coverup: false,
  offers_custom_design: true,
  has_flash_designs: false,
  lat: null,
  lng: null,
  avatar_url: 'https://example.com/avatar.jpg',
  deposit_amount: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  // Fields that must be excluded from public response
  admin_note: 'VIP artist — fast-tracked',
  line_user_id: 'U1234567890',
  artist_styles: [{ styles: { id: 1, name: '極簡線條', slug: 'fine-line' } }],
}

describe('GET /api/artists/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when artist slug does not exist', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createServerClient).mockResolvedValue({ from: mockFrom } as never)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists/nonexistent-slug')
    const response = await GET(request, { params: Promise.resolve({ slug: 'nonexistent-slug' }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Artist not found')
  })

  it('returns 200 with public artist data excluding admin_note and line_user_id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtistRow, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createServerClient).mockResolvedValue({ from: mockFrom } as never)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists/ink-master')
    const response = await GET(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('artist-uuid-1')
    expect(body.display_name).toBe('刺青大師')
    expect(body.city).toBe('台北市')
    expect(body.styles).toBeDefined()
  })

  it('strips admin_note and line_user_id from response', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtistRow, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createServerClient).mockResolvedValue({ from: mockFrom } as never)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists/ink-master')
    const response = await GET(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    // admin_note and artist_styles are explicitly destructured out by the handler
    expect(body).not.toHaveProperty('admin_note')
    expect(body).not.toHaveProperty('artist_styles')
    expect(body).not.toHaveProperty('line_user_id')
  })

  it('returns flattened styles array in response', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockArtistRow, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createServerClient).mockResolvedValue({ from: mockFrom } as never)

    const request = makeRequest('GET', 'http://localhost:3000/api/artists/ink-master')
    const response = await GET(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(Array.isArray(body.styles)).toBe(true)
    expect(body.styles[0]).toMatchObject({ id: 1, name: '極簡線條', slug: 'fine-line' })
  })
})

describe('PATCH /api/artists/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('UNAUTHORIZED'))

    const request = makeRequest('PATCH', 'http://localhost:3000/api/artists/ink-master', {
      display_name: '新名稱',
    })
    const response = await PATCH(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when artist slug does not belong to the authenticated user', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(getArtistForUser).mockResolvedValue({
      id: 'artist-uuid-99',
      slug: 'other-artist',    // Different slug — not the owner
      line_user_id: 'U1234567890',
    } as never)

    const request = makeRequest('PATCH', 'http://localhost:3000/api/artists/ink-master', {
      display_name: '試圖竄改他人資料',
    })
    const response = await PATCH(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when user has no artist profile at all', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(getArtistForUser).mockResolvedValue(null)

    const request = makeRequest('PATCH', 'http://localhost:3000/api/artists/ink-master', {
      city: '台中市',
    })
    const response = await PATCH(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 and updates artist when owner patches their own profile', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(getArtistForUser).mockResolvedValue({
      id: 'artist-uuid-1',
      slug: 'ink-master',
      line_user_id: 'U1234567890',
    } as never)

    const updatedArtist = {
      id: 'artist-uuid-1',
      slug: 'ink-master',
      display_name: '刺青大師 Updated',
      city: '新北市',
      bio: '更新後的介紹',
      status: 'active',
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: updatedArtist, error: null })
    const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEqId = vi.fn().mockReturnValue({ select: mockSelectUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId })
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const request = makeRequest('PATCH', 'http://localhost:3000/api/artists/ink-master', {
      display_name: '刺青大師 Updated',
      city: '新北市',
      bio: '更新後的介紹',
    })
    const response = await PATCH(request, { params: Promise.resolve({ slug: 'ink-master' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.display_name).toBe('刺青大師 Updated')
    expect(body.city).toBe('新北市')

    // Verify update was applied to the correct artist id
    expect(mockEqId).toHaveBeenCalledWith('id', 'artist-uuid-1')
  })

  it('replaces style associations when style_ids provided in PATCH', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(getArtistForUser).mockResolvedValue({
      id: 'artist-uuid-1',
      slug: 'ink-master',
      line_user_id: 'U1234567890',
    } as never)

    const mockSingleUpdate = vi.fn().mockResolvedValue({ data: { id: 'artist-uuid-1', slug: 'ink-master' }, error: null })
    const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate })
    const mockEqId = vi.fn().mockReturnValue({ select: mockSelectUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId })

    // Mocks for style sync: select old, delete, insert new
    const mockOldStylesData = [{ style_id: 1 }, { style_id: 2 }]
    const mockSelectStyles = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockOldStylesData }),
    })
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq })
    const mockInsertStyles = vi.fn().mockResolvedValue({ error: null })

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'artists') return { update: mockUpdate }
      if (table === 'artist_styles') {
        return {
          select: mockSelectStyles,
          delete: mockDelete,
          insert: mockInsertStyles,
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const request = makeRequest('PATCH', 'http://localhost:3000/api/artists/ink-master', {
      style_ids: [3, 5],
    })
    const response = await PATCH(request, { params: Promise.resolve({ slug: 'ink-master' }) })

    expect(response.status).toBe(200)
    // Old styles deleted
    expect(mockDeleteEq).toHaveBeenCalledWith('artist_id', 'artist-uuid-1')
    // New styles inserted
    expect(mockInsertStyles).toHaveBeenCalledWith([
      { artist_id: 'artist-uuid-1', style_id: 3 },
      { artist_id: 'artist-uuid-1', style_id: 5 },
    ])
  })
})
