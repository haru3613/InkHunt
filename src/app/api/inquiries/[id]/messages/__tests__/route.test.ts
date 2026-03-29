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
}))

vi.mock('@/lib/supabase/queries/messages', () => ({
  getMessagesByInquiry: vi.fn(),
  sendMessage: vi.fn(),
  markMessagesAsRead: vi.fn(),
}))

// Fire-and-forget LINE notification — not tested here
vi.mock('@/lib/line/messaging', () => ({
  pushNewMessageNotification: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '../route'
import { requireAuth, authorizeInquiryAccess } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import {
  getMessagesByInquiry,
  sendMessage,
  markMessagesAsRead,
} from '@/lib/supabase/queries/messages'

const mockRequireAuth = vi.mocked(requireAuth)
const mockAuthorizeInquiryAccess = vi.mocked(authorizeInquiryAccess)
const mockGetInquiryById = vi.mocked(getInquiryById)
const mockGetMessagesByInquiry = vi.mocked(getMessagesByInquiry)
const mockSendMessage = vi.mocked(sendMessage)
const mockMarkMessagesAsRead = vi.mocked(markMessagesAsRead)

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

const MOCK_INQUIRY = {
  id: 'inquiry-uuid-1',
  artist_id: 'artist-uuid-1',
  consumer_line_id: 'Uconsumer123',
  description: '我想刺一個極簡線條的玫瑰在手腕上',
  status: 'pending',
}

const MOCK_MESSAGES = [
  {
    id: 'msg-uuid-1',
    inquiry_id: 'inquiry-uuid-1',
    sender_type: 'consumer',
    sender_id: 'Uconsumer123',
    message_type: 'text',
    content: '您好，我想詢問價格',
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'msg-uuid-2',
    inquiry_id: 'inquiry-uuid-1',
    sender_type: 'artist',
    sender_id: 'Uartist123',
    message_type: 'text',
    content: '您好，請問您想刺的位置和大小？',
    created_at: '2026-01-01T10:05:00Z',
  },
]

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

describe('GET /api/inquiries/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    const res = await GET(req, params)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    const res = await GET(req, params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 403 when user has no access to the inquiry', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    const res = await GET(req, params)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with messages for the consumer', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })
    mockGetMessagesByInquiry.mockResolvedValueOnce(MOCK_MESSAGES as never)
    mockMarkMessagesAsRead.mockResolvedValueOnce(undefined)

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    const res = await GET(req, params)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0].id).toBe('msg-uuid-1')
    expect(body.messages[1].id).toBe('msg-uuid-2')
  })

  it('marks messages as read with correct sender type for consumer', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })
    mockGetMessagesByInquiry.mockResolvedValueOnce([] as never)
    mockMarkMessagesAsRead.mockResolvedValueOnce(undefined)

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    await GET(req, params)

    expect(mockMarkMessagesAsRead).toHaveBeenCalledWith(
      INQUIRY_ID,
      MOCK_CONSUMER_USER.lineUserId,
      'consumer',
    )
  })

  it('marks messages as read with correct sender type for artist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: false,
      isArtist: true,
      artist: { id: 'artist-uuid-1' } as never,
    })
    mockGetMessagesByInquiry.mockResolvedValueOnce([] as never)
    mockMarkMessagesAsRead.mockResolvedValueOnce(undefined)

    const req = makeRequest('GET', `/api/inquiries/${INQUIRY_ID}/messages`)
    await GET(req, params)

    expect(mockMarkMessagesAsRead).toHaveBeenCalledWith(
      INQUIRY_ID,
      MOCK_ARTIST_USER.lineUserId,
      'artist',
    )
  })
})

describe('POST /api/inquiries/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '您好',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when message_type is invalid', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'video',
      content: '我要傳影片',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 400 when content is empty', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
  })

  it('returns 404 when inquiry does not exist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(null)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '請問可以預約嗎',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Inquiry not found')
  })

  it('returns 403 when user has no access to the inquiry', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '我是未授權用戶',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 201 with sent message when consumer sends text', async () => {
    const newMessage = {
      id: 'msg-uuid-new',
      inquiry_id: INQUIRY_ID,
      sender_type: 'consumer',
      sender_id: 'Uconsumer123',
      message_type: 'text',
      content: '請問可以預約下週嗎',
      created_at: '2026-01-01T11:00:00Z',
    }
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })
    mockSendMessage.mockResolvedValueOnce(newMessage as never)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '請問可以預約下週嗎',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('msg-uuid-new')
    expect(body.content).toBe('請問可以預約下週嗎')
    expect(body.sender_type).toBe('consumer')
  })

  it('calls sendMessage with artist sender type when artist replies', async () => {
    const newMessage = {
      id: 'msg-uuid-artist',
      inquiry_id: INQUIRY_ID,
      sender_type: 'artist',
      sender_id: 'Uartist123',
      message_type: 'text',
      content: '可以，下週三有空',
      created_at: '2026-01-01T11:05:00Z',
    }
    mockRequireAuth.mockResolvedValueOnce(MOCK_ARTIST_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: false,
      isArtist: true,
      artist: { id: 'artist-uuid-1' } as never,
    })
    mockSendMessage.mockResolvedValueOnce(newMessage as never)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'text',
      content: '可以，下週三有空',
    })
    await POST(req, params)

    expect(mockSendMessage).toHaveBeenCalledWith(
      INQUIRY_ID,
      'artist',
      MOCK_ARTIST_USER.lineUserId,
      'text',
      '可以，下週三有空',
    )
  })

  it('returns 201 when sending an image message', async () => {
    const imageMessage = {
      id: 'msg-uuid-img',
      inquiry_id: INQUIRY_ID,
      sender_type: 'consumer',
      sender_id: 'Uconsumer123',
      message_type: 'image',
      content: 'https://storage.example.com/ref-image.jpg',
      created_at: '2026-01-01T11:10:00Z',
    }
    mockRequireAuth.mockResolvedValueOnce(MOCK_CONSUMER_USER)
    mockGetInquiryById.mockResolvedValueOnce(MOCK_INQUIRY as never)
    mockAuthorizeInquiryAccess.mockResolvedValueOnce({
      isConsumer: true,
      isArtist: false,
      artist: null,
    })
    mockSendMessage.mockResolvedValueOnce(imageMessage as never)

    const req = makeRequest('POST', `/api/inquiries/${INQUIRY_ID}/messages`, {
      message_type: 'image',
      content: 'https://storage.example.com/ref-image.jpg',
    })
    const res = await POST(req, params)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message_type).toBe('image')
  })
})
