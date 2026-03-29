import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth BEFORE importing route handlers
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  authorizeInquiryAccess: vi.fn(),
  handleApiError: vi.fn().mockImplementation((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
}))

vi.mock('@/lib/supabase/queries/inquiries', () => ({
  getInquiryById: vi.fn(),
  updateInquiryStatus: vi.fn(),
}))

// createServerClient is called inside GET to fetch artist data.
// The factory must be self-contained (no outer variables) because vi.mock is hoisted.
// We expose createServerClient as a vi.fn() and reconfigure its resolved value per-test.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { GET, PATCH } from '../route'
import { requireAuth, authorizeInquiryAccess } from '@/lib/auth/helpers'
import { getInquiryById, updateInquiryStatus } from '@/lib/supabase/queries/inquiries'
import { createServerClient } from '@/lib/supabase/server'

const mockRequireAuth = vi.mocked(requireAuth)
const mockAuthorizeInquiryAccess = vi.mocked(authorizeInquiryAccess)
const mockGetInquiryById = vi.mocked(getInquiryById)
const mockUpdateInquiryStatus = vi.mocked(updateInquiryStatus)
const mockCreateServerClient = vi.mocked(createServerClient)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

const MOCK_INQUIRY = {
  id: 'inquiry-uuid-1',
  artist_id: 'artist-uuid-1',
  consumer_line_id: 'Uconsumer123',
  description: '我想刺一個極簡線條的玫瑰在手腕上，大約5公分',
  status: 'pending' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const MOCK_ARTIST_DATA = {
  id: 'artist-uuid-1',
  slug: 'test-artist',
  display_name: '測試刺青師',
  avatar_url: null,
}

// Build a minimal Supabase query chain: .from().select().eq().single()
function makeSupabaseChain(resolvedValue: unknown) {
  const single = vi.fn().mockResolvedValue(resolvedValue)
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from }
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/inquiries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: artist lookup succeeds
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseChain({ data: MOCK_ARTIST_DATA, error: null }) as never,
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('GET', '/api/inquiries/inquiry-uuid-1')
    const res = await GET(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('GET', '/api/inquiries/nonexistent')
    const res = await GET(req, makeParams('nonexistent'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 403 when user is not the consumer or artist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))

    const req = makeRequest('GET', '/api/inquiries/inquiry-uuid-1')
    const res = await GET(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with inquiry and artist data on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })

    const req = makeRequest('GET', '/api/inquiries/inquiry-uuid-1')
    const res = await GET(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inquiry.id).toBe('inquiry-uuid-1')
    expect(body.artist).toBeDefined()
    expect(body.artist.slug).toBe('test-artist')
  })

  it('calls authorizeInquiryAccess with the resolved user and inquiry', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })

    const req = makeRequest('GET', '/api/inquiries/inquiry-uuid-1')
    await GET(req, makeParams('inquiry-uuid-1'))

    expect(mockAuthorizeInquiryAccess).toHaveBeenCalledWith(MOCK_USER, MOCK_INQUIRY)
  })
})

describe('PATCH /api/inquiries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('PATCH', '/api/inquiries/inquiry-uuid-1', { status: 'closed' })
    const res = await PATCH(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('PATCH', '/api/inquiries/nonexistent', { status: 'closed' })
    const res = await PATCH(req, makeParams('nonexistent'))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 400 when status value is not "closed"', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })

    const req = makeRequest('PATCH', '/api/inquiries/inquiry-uuid-1', { status: 'accepted' })
    const res = await PATCH(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid status update')
  })

  it('returns 200 with updated inquiry when closing', async () => {
    const closedInquiry = { ...MOCK_INQUIRY, status: 'closed' as const }
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })
    mockUpdateInquiryStatus.mockResolvedValueOnce(closedInquiry as never)

    const req = makeRequest('PATCH', '/api/inquiries/inquiry-uuid-1', { status: 'closed' })
    const res = await PATCH(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('closed')
    expect(mockUpdateInquiryStatus).toHaveBeenCalledWith('inquiry-uuid-1', 'closed')
  })

  it('returns 403 when unauthorized user attempts to close inquiry', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))

    const req = makeRequest('PATCH', '/api/inquiries/inquiry-uuid-1', { status: 'closed' })
    const res = await PATCH(req, makeParams('inquiry-uuid-1'))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })
})
