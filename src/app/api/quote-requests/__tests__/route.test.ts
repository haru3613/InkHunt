import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Use vi.hoisted so mock functions are available inside vi.mock factory closures
const { mockRequireAuth, mockHandleApiError, mockCreateQuoteRequest, mockPushNewInquiryNotification } =
  vi.hoisted(() => ({
    mockRequireAuth: vi.fn(),
    mockHandleApiError: vi.fn(),
    mockCreateQuoteRequest: vi.fn(),
    mockPushNewInquiryNotification: vi.fn(),
  }))

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}))

vi.mock('@/lib/supabase/queries/quote-requests', () => ({
  createQuoteRequest: mockCreateQuoteRequest,
}))

vi.mock('@/lib/line/messaging', () => ({
  pushNewInquiryNotification: mockPushNewInquiryNotification,
}))

import { POST } from '../route'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

const validBody = {
  artist_ids: ['123e4567-e89b-12d3-a456-426614174000'],
  description: 'I want a traditional Japanese sleeve tattoo on my left arm.',
  reference_images: [],
  body_part: 'left arm',
  size_estimate: '30cm x 20cm',
  budget_min: 5000,
  budget_max: 15000,
}

const mockUser = {
  supabaseId: 'sup-123',
  lineUserId: 'U_consumer_line_id',
  displayName: 'Test Consumer',
  avatarUrl: null,
}

describe('POST /api/quote-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleApiError.mockImplementation((err: unknown) => {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    })
    mockPushNewInquiryNotification.mockResolvedValue(undefined)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

    const request = makeRequest('POST', 'http://localhost:3000/api/quote-requests', validBody)
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when description is too short', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)

    const invalidBody = { ...validBody, description: 'short' }
    const request = makeRequest('POST', 'http://localhost:3000/api/quote-requests', invalidBody)
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Validation failed')
    expect(json.details).toBeDefined()
  })

  it('returns 400 when artist_ids is empty', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)

    const invalidBody = { ...validBody, artist_ids: [] }
    const request = makeRequest('POST', 'http://localhost:3000/api/quote-requests', invalidBody)
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Validation failed')
  })

  it('returns 201 with id and inquiryCount on successful creation', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockCreateQuoteRequest.mockResolvedValue({
      quoteRequest: { id: 'qr-abc-123', consumer_line_id: mockUser.lineUserId },
      inquiries: [{ id: 'inq-1', artist_id: validBody.artist_ids[0] }],
    })

    const request = makeRequest('POST', 'http://localhost:3000/api/quote-requests', validBody)
    const response = await POST(request)

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.id).toBe('qr-abc-123')
    expect(json.inquiryCount).toBe(1)
  })

  it('fires LINE notifications fire-and-forget for each inquiry', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)

    const twoArtistBody = {
      ...validBody,
      artist_ids: [
        '123e4567-e89b-12d3-a456-426614174000',
        '223e4567-e89b-12d3-a456-426614174001',
      ],
    }
    mockCreateQuoteRequest.mockResolvedValue({
      quoteRequest: { id: 'qr-multi-123' },
      inquiries: [
        { id: 'inq-1', artist_id: twoArtistBody.artist_ids[0] },
        { id: 'inq-2', artist_id: twoArtistBody.artist_ids[1] },
      ],
    })

    const request = makeRequest('POST', 'http://localhost:3000/api/quote-requests', twoArtistBody)
    const response = await POST(request)

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.inquiryCount).toBe(2)
    expect(mockPushNewInquiryNotification).toHaveBeenCalledTimes(2)
  })
})
