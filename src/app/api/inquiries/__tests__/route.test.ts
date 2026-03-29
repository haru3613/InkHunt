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

vi.mock('@/lib/supabase/queries/inquiries', () => ({
  validateInquiryCreate: vi.fn(),
  createInquiry: vi.fn(),
  getInquiriesForArtist: vi.fn(),
  getInquiriesForConsumer: vi.fn(),
}))

vi.mock('@/lib/supabase/queries/messages', () => ({
  getUnreadCountsForUser: vi.fn(),
}))

// Fire-and-forget LINE notification — not tested here
vi.mock('@/lib/line/messaging', () => ({
  pushNewInquiryNotification: vi.fn().mockResolvedValue(undefined),
}))

import { POST, GET } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import {
  validateInquiryCreate,
  createInquiry,
  getInquiriesForArtist,
  getInquiriesForConsumer,
} from '@/lib/supabase/queries/inquiries'
import { getUnreadCountsForUser } from '@/lib/supabase/queries/messages'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockValidateInquiryCreate = vi.mocked(validateInquiryCreate)
const mockCreateInquiry = vi.mocked(createInquiry)
const mockGetInquiriesForArtist = vi.mocked(getInquiriesForArtist)
const mockGetInquiriesForConsumer = vi.mocked(getInquiriesForConsumer)
const mockGetUnreadCountsForUser = vi.mocked(getUnreadCountsForUser)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

const MOCK_ARTIST_USER = {
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

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

describe('POST /api/inquiries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('POST', '/api/inquiries', { description: 'test' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when validation fails', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockValidateInquiryCreate.mockReturnValueOnce({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: { description: ['請至少描述 10 個字'] },
        }),
      },
    } as ReturnType<typeof validateInquiryCreate>)

    const req = makeRequest('POST', '/api/inquiries', { description: '短' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 201 with inquiry id on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockValidateInquiryCreate.mockReturnValueOnce({
      success: true,
      data: {
        artist_id: 'artist-uuid-1',
        description: '我想刺一個極簡線條的玫瑰在手腕上',
        reference_images: [],
      },
    } as ReturnType<typeof validateInquiryCreate>)
    mockCreateInquiry.mockResolvedValueOnce({
      inquiry: { id: 'inquiry-uuid-new', artist_id: 'artist-uuid-1' } as never,
      messages: [],
    })

    const req = makeRequest('POST', '/api/inquiries', {
      artist_id: 'artist-uuid-1',
      description: '我想刺一個極簡線條的玫瑰在手腕上',
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('inquiry-uuid-new')
  })

  it('calls createInquiry with correct user identity', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    const validData = {
      artist_id: 'artist-uuid-1',
      description: '我想刺一個幾何圖案在背部中央位置',
      reference_images: [],
    }
    mockValidateInquiryCreate.mockReturnValueOnce({
      success: true,
      data: validData,
    } as ReturnType<typeof validateInquiryCreate>)
    mockCreateInquiry.mockResolvedValueOnce({
      inquiry: { id: 'inquiry-uuid-x', artist_id: 'artist-uuid-1' } as never,
      messages: [],
    })

    const req = makeRequest('POST', '/api/inquiries', validData)
    await POST(req)

    expect(mockCreateInquiry).toHaveBeenCalledWith(
      MOCK_USER.lineUserId,
      MOCK_USER.displayName,
      validData,
    )
  })
})

describe('GET /api/inquiries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('GET', '/api/inquiries')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns consumer inquiries for default role', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetInquiriesForConsumer.mockResolvedValueOnce({
      data: [{ id: 'inquiry-1', consumer_line_id: 'Uconsumer123' } as never],
      total: 1,
    })

    const req = makeRequest('GET', '/api/inquiries')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('inquiry-1')
    expect(mockGetInquiriesForConsumer).toHaveBeenCalledWith('Uconsumer123', 1)
  })

  it('returns artist inquiries with unread counts when role=artist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    mockGetInquiriesForArtist.mockResolvedValueOnce({
      data: [
        { id: 'inquiry-1', artist_id: 'artist-uuid-1' } as never,
        { id: 'inquiry-2', artist_id: 'artist-uuid-1' } as never,
      ],
      total: 2,
    })
    mockGetUnreadCountsForUser.mockResolvedValueOnce(
      new Map([['inquiry-1', 3], ['inquiry-2', 0]]),
    )

    const req = makeRequest('GET', '/api/inquiries?role=artist')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].unread_count).toBe(3)
    expect(body.data[1].unread_count).toBe(0)
    expect(mockGetInquiriesForArtist).toHaveBeenCalledWith('artist-uuid-1', undefined, 1)
  })

  it('returns 403 when role=artist but user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const req = makeRequest('GET', '/api/inquiries?role=artist')
    const res = await GET(req)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not an artist')
  })

  it('passes status filter to getInquiriesForArtist when role=artist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    mockGetInquiriesForArtist.mockResolvedValueOnce({ data: [], total: 0 })
    mockGetUnreadCountsForUser.mockResolvedValueOnce(new Map())

    const req = makeRequest('GET', '/api/inquiries?role=artist&status=pending')
    await GET(req)

    expect(mockGetInquiriesForArtist).toHaveBeenCalledWith('artist-uuid-1', 'pending', 1)
  })

  it('ignores invalid status values', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    mockGetInquiriesForArtist.mockResolvedValueOnce({ data: [], total: 0 })
    mockGetUnreadCountsForUser.mockResolvedValueOnce(new Map())

    const req = makeRequest('GET', '/api/inquiries?role=artist&status=invalid')
    await GET(req)

    expect(mockGetInquiriesForArtist).toHaveBeenCalledWith('artist-uuid-1', undefined, 1)
  })
})
