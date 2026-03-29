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
  getInquiryById: vi.fn(),
}))

vi.mock('@/lib/supabase/queries/quotes', () => ({
  validateQuoteCreate: vi.fn(),
  createQuote: vi.fn(),
  respondToQuote: vi.fn(),
  markQuoteViewed: vi.fn(),
}))

// Fire-and-forget LINE notification — not tested here
vi.mock('@/lib/line/messaging', () => ({
  pushQuoteNotification: vi.fn().mockResolvedValue(undefined),
}))

import { POST, PATCH } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import {
  validateQuoteCreate,
  createQuote,
  respondToQuote,
  markQuoteViewed,
} from '@/lib/supabase/queries/quotes'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockGetInquiryById = vi.mocked(getInquiryById)
const mockValidateQuoteCreate = vi.mocked(validateQuoteCreate)
const mockCreateQuote = vi.mocked(createQuote)
const mockRespondToQuote = vi.mocked(respondToQuote)
const mockMarkQuoteViewed = vi.mocked(markQuoteViewed)

const MOCK_ARTIST_USER = {
  supabaseId: 'supabase-uuid-artist',
  lineUserId: 'Uartist123',
  displayName: '測試刺青師',
  avatarUrl: null,
}

const MOCK_CONSUMER_USER = {
  supabaseId: 'supabase-uuid-consumer',
  lineUserId: 'Uconsumer123',
  displayName: '測試消費者',
  avatarUrl: null,
}

const MOCK_ARTIST = {
  id: 'artist-uuid-1',
  slug: 'test-artist',
  display_name: '測試刺青師',
  line_user_id: 'Uartist123',
}

const MOCK_INQUIRY = {
  id: 'inquiry-uuid-1',
  artist_id: 'artist-uuid-1',
  consumer_line_id: 'Uconsumer123',
  description: '我想刺一個極簡線條的玫瑰在手腕上',
  status: 'pending',
}

const MOCK_QUOTE = {
  id: 'quote-uuid-1',
  inquiry_id: 'inquiry-uuid-1',
  artist_id: 'artist-uuid-1',
  price: 5000,
  note: '預計兩小時完成',
  status: 'sent',
}

const MOCK_MESSAGE = {
  id: 'message-uuid-1',
  inquiry_id: 'inquiry-uuid-1',
  sender_type: 'artist',
  sender_id: 'Uartist123',
  message_type: 'quote',
  content: '報價 NT$5,000',
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

const INQUIRY_ID = 'inquiry-uuid-1'
const params = { params: Promise.resolve({ id: INQUIRY_ID }) }

describe('POST /api/inquiries/[id]/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, { price: 5000 })
    const res = await POST(req, params)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when validation fails', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: { price: ['Price must be positive'] },
        }),
      },
    } as ReturnType<typeof validateQuoteCreate>)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, { price: -1 })
    const res = await POST(req, params)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: true,
      data: { price: 5000 },
    } as ReturnType<typeof validateQuoteCreate>)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, { price: 5000 })
    const res = await POST(req, params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 403 when artist does not own the inquiry', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: true,
      data: { price: 5000 },
    } as ReturnType<typeof validateQuoteCreate>)
    mockGetInquiryById.mockResolvedValueOnce({
      ...MOCK_INQUIRY,
      artist_id: 'different-artist-uuid',
    } as never)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, { price: 5000 })
    const res = await POST(req, params)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: true,
      data: { price: 5000 },
    } as ReturnType<typeof validateQuoteCreate>)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, { price: 5000 })
    const res = await POST(req, params)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 201 with quote and message on success', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: true,
      data: { price: 5000, note: '預計兩小時完成' },
    } as ReturnType<typeof validateQuoteCreate>)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    mockCreateQuote.mockResolvedValueOnce({
      quote: MOCK_QUOTE as never,
      message: MOCK_MESSAGE as never,
    })

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      price: 5000,
      note: '預計兩小時完成',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.quote.id).toBe('quote-uuid-1')
    expect(body.quote.price).toBe(5000)
    expect(body.message.message_type).toBe('quote')
  })

  it('calls createQuote with correct artist and inquiry ids', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    const validData = { price: 5000 }
    mockValidateQuoteCreate.mockReturnValueOnce({
      success: true,
      data: validData,
    } as ReturnType<typeof validateQuoteCreate>)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    mockCreateQuote.mockResolvedValueOnce({
      quote: MOCK_QUOTE as never,
      message: MOCK_MESSAGE as never,
    })

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/quotes`, validData)
    await POST(req, params)

    expect(mockCreateQuote).toHaveBeenCalledWith(
      INQUIRY_ID,
      'artist-uuid-1',
      MOCK_ARTIST_USER.lineUserId,
      validData,
    )
  })
})

describe('PATCH /api/inquiries/[id]/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'accepted',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when quote_id is missing', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      status: 'accepted',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 400 when status is invalid', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'invalid-status',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'accepted',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 403 when user is not the inquiry consumer', async () => {
    mockRequireAuth.mockResolvedValueOnce({ ...MOCK_CONSUMER_USER, lineUserId: 'Uother999' })
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'accepted',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with updated quote when consumer accepts', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockRespondToQuote.mockResolvedValueOnce({ ...MOCK_QUOTE, status: 'accepted' } as never)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'accepted',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('accepted')
    expect(mockRespondToQuote).toHaveBeenCalledWith('quote-uuid-1', INQUIRY_ID, 'accepted')
  })

  it('returns 200 with updated quote when consumer rejects', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockRespondToQuote.mockResolvedValueOnce({ ...MOCK_QUOTE, status: 'rejected' } as never)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'rejected',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('rejected')
  })

  it('calls markQuoteViewed and returns result when status=viewed', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockMarkQuoteViewed.mockResolvedValueOnce({ ...MOCK_QUOTE, status: 'viewed' } as never)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'viewed',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('viewed')
    expect(mockMarkQuoteViewed).toHaveBeenCalledWith('quote-uuid-1', INQUIRY_ID)
    expect(mockRespondToQuote).not.toHaveBeenCalled()
  })

  it('returns already_viewed sentinel when quote was already viewed', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockMarkQuoteViewed.mockResolvedValueOnce(null)

    const req = makeRequest('PATCH', `/api/inquiries/${INQUIRY_ID}/quotes`, {
      quote_id: 'quote-uuid-1',
      status: 'viewed',
    })
    const res = await PATCH(req, params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('already_viewed')
  })
})
