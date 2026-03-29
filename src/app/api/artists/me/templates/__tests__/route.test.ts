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
  createAdminClient: vi.fn(),
}))

import { GET, PUT } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
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
  quote_templates: [
    { label: '小型刺青', price: 3000, note: '10cm 以下' },
    { label: '中型刺青', price: 8000, note: '10-20cm' },
  ],
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

describe('GET /api/artists/me/templates', () => {
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

  it('returns 404 when authenticated user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const res = await GET()

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Artist profile not found')
  })

  it('returns 200 with templates array', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.templates).toHaveLength(2)
    expect(body.templates[0].label).toBe('小型刺青')
    expect(body.templates[0].price).toBe(3000)
  })

  it('returns empty array when artist has no templates', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce({
      ...MOCK_ARTIST,
      quote_templates: null,
    } as never)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.templates).toEqual([])
  })
})

describe('PUT /api/artists/me/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: [{ label: '小型', price: 3000 }],
    })
    const res = await PUT(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when authenticated user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: [{ label: '小型', price: 3000 }],
    })
    const res = await PUT(req)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Artist profile not found')
  })

  it('returns 400 when templates array exceeds 5 items', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const tooManyTemplates = Array.from({ length: 6 }, (_, i) => ({
      label: `模板 ${i + 1}`,
      price: 1000 * (i + 1),
    }))

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: tooManyTemplates,
    })
    const res = await PUT(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 400 when a template has an invalid field', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: [
        { label: '', price: 3000 }, // label min(1) violated
      ],
    })
    const res = await PUT(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
  })

  it('returns 200 with updated templates on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const newTemplates = [
      { label: '小型刺青', price: 3500, note: '更新後' },
      { label: '大型刺青', price: 15000 },
    ]

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(updateChain),
    } as never)

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: newTemplates,
    })
    const res = await PUT(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.templates).toHaveLength(2)
    expect(body.templates[0].label).toBe('小型刺青')
    expect(body.templates[0].price).toBe(3500)
    expect(body.templates[1].label).toBe('大型刺青')
  })

  it('persists exactly the validated templates to the DB', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const newTemplates = [{ label: '客製化', price: 20000, note: '依需求報價' }]

    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    } as never)

    const req = makeRequest('PUT', '/api/artists/me/templates', {
      templates: newTemplates,
    })
    await PUT(req)

    expect(updateMock).toHaveBeenCalledWith({ quote_templates: newTemplates })
    expect(eqMock).toHaveBeenCalledWith('id', 'artist-uuid-1')
  })
})
