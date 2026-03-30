import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPushMessage = vi.fn()
vi.mock('@line/bot-sdk', () => ({
  messagingApi: {
    // Use a class so `new MessagingApiClient(...)` returns an instance that
    // holds our mockPushMessage reference. Arrow functions used as constructors
    // with vi.fn() lose their return value in Vitest.
    MessagingApiClient: class {
      pushMessage = mockPushMessage
    },
  },
}))

const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}))

import {
  buildInquiryNotificationMessage,
  buildQuoteNotificationMessage,
  pushNewInquiryNotification,
  pushQuoteNotification,
  pushNewMessageNotification,
} from '../messaging'
import type { Inquiry, Quote, Message } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThenable<T>(resolved: T) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolved, error: null }),
  }
  return chain
}

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inquiry-123',
    artist_id: 'artist-1',
    consumer_line_id: 'U123',
    consumer_name: '小明',
    description: 'test description',
    reference_images: [],
    body_part: null,
    size_estimate: null,
    budget_min: null,
    budget_max: null,
    status: 'pending',
    quote_request_id: null,
    created_at: '2026-03-29T00:00:00Z',
    ...overrides,
  }
}

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    inquiry_id: 'inquiry-123',
    artist_id: 'artist-1',
    price: 8000,
    note: null,
    available_dates: null,
    status: 'sent',
    created_at: '2026-03-29T00:00:00Z',
    ...overrides,
  }
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    inquiry_id: 'inquiry-123',
    sender_type: 'consumer',
    sender_id: null,
    message_type: 'text',
    content: '請問可以幫我刺一個小玫瑰嗎',
    metadata: {},
    read_at: null,
    created_at: '2026-03-29T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Environment stubs
// ---------------------------------------------------------------------------

vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://inkhunt.tw')
vi.stubEnv('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN', 'test-token')

beforeEach(() => {
  mockPushMessage.mockReset()
  mockAdminFrom.mockReset()
})

// ---------------------------------------------------------------------------
// Existing tests — buildInquiryNotificationMessage
// ---------------------------------------------------------------------------

describe('buildInquiryNotificationMessage', () => {
  it('truncates long descriptions to 80 chars', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ description: 'A'.repeat(100) }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('A'.repeat(77) + '...')
  })

  it('does not truncate short descriptions', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ description: 'short desc' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('short desc')
    expect(textBody).not.toContain('short desc...')
  })

  it('includes deep link to dashboard with inquiry id', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ id: 'inquiry-456' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('inquiry=inquiry-456')
  })

  it('returns a flex message with type flex', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    expect(msg.type).toBe('flex')
  })

  it('includes consumer name', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ consumer_name: '大衛' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('大衛')
  })

  it('falls back to 匿名用戶 when no consumer name', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ consumer_name: null }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('匿名用戶')
  })

  it('includes body part when provided', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ body_part: '手臂' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('手臂')
    expect(textBody).toContain('部位')
  })

  it('includes budget range when both min and max provided', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_min: 3000, budget_max: 8000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$3,000')
    expect(textBody).toContain('NT$8,000')
  })

  it('shows budget_min only with 起', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_min: 5000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$5,000 起')
  })

  it('shows budget_max only with 以內', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_max: 10000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$10,000 以內')
  })

  it('uses brass gold accent color', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#C8A97E')
  })

  it('uses dark theme background', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#1A1A1A')
  })
})

// ---------------------------------------------------------------------------
// Existing tests — buildQuoteNotificationMessage
// ---------------------------------------------------------------------------

describe('buildQuoteNotificationMessage', () => {
  it('formats price with NT$ prefix', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist Name',
      5000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$5,000')
  })

  it('includes artist name in the message', () => {
    const msg = buildQuoteNotificationMessage(
      'Tattoo Master',
      3000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('Tattoo Master')
  })

  it('includes link to inquiry detail page', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      5000,
      'http://localhost:3000',
      'inquiry-789',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('/inquiries/inquiry-789')
  })

  it('returns a flex message with type flex', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      1000,
      'http://localhost:3000',
      'inquiry-123',
    )
    expect(msg.type).toBe('flex')
  })

  it('uses brass gold accent color', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      1000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#C8A97E')
  })

  it('formats large prices with commas', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      150000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$150,000')
  })
})

// ---------------------------------------------------------------------------
// New tests — pushNewInquiryNotification
// ---------------------------------------------------------------------------

describe('pushNewInquiryNotification', () => {
  it('pushes a flex message to the artist LINE ID', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist123' }),
    )
    mockPushMessage.mockResolvedValue(undefined)

    await pushNewInquiryNotification(makeInquiry({ artist_id: 'artist-1' }))

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    expect(call.to).toBe('Uartist123')
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0].type).toBe('flex')
  })

  it('does nothing when the artist has no LINE ID', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: null }),
    )

    await pushNewInquiryNotification(makeInquiry())

    expect(mockPushMessage).not.toHaveBeenCalled()
  })

  it('does not throw when pushMessage rejects', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist123' }),
    )
    mockPushMessage.mockRejectedValue(new Error('LINE API error'))

    await expect(pushNewInquiryNotification(makeInquiry())).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// New tests — pushQuoteNotification
// ---------------------------------------------------------------------------

describe('pushQuoteNotification', () => {
  it('pushes a quote notification to the consumer LINE ID', async () => {
    mockPushMessage.mockResolvedValue(undefined)

    const inquiry = makeInquiry({ consumer_line_id: 'Uconsumer456' })
    const quote = makeQuote({ price: 12000 })

    await pushQuoteNotification(inquiry, quote, '刺青師小王')

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    expect(call.to).toBe('Uconsumer456')
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0].type).toBe('flex')
    expect(JSON.stringify(call.messages[0])).toContain('NT$12,000')
  })

  it('does not throw when pushMessage rejects', async () => {
    mockPushMessage.mockRejectedValue(new Error('LINE API error'))

    await expect(
      pushQuoteNotification(makeInquiry(), makeQuote(), '刺青師小王'),
    ).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// New tests — pushNewMessageNotification
// ---------------------------------------------------------------------------

describe('pushNewMessageNotification', () => {
  it('sends to artist LINE ID when sender is consumer', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist999' }),
    )
    mockPushMessage.mockResolvedValue(undefined)

    const inquiry = makeInquiry({ artist_id: 'artist-1' })
    const msg = makeMessage({ message_type: 'text', content: '請問可以嗎' })

    await pushNewMessageNotification(inquiry, msg, 'consumer', '消費者小明')

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    expect(call.to).toBe('Uartist999')
    expect(call.messages[0].text).toContain('消費者小明')
    expect(call.messages[0].text).toContain('請問可以嗎')
  })

  it('sends to consumer LINE ID when sender is artist', async () => {
    mockPushMessage.mockResolvedValue(undefined)

    const inquiry = makeInquiry({ consumer_line_id: 'Uconsumer777' })
    const msg = makeMessage({ message_type: 'text', content: '沒問題！' })

    await pushNewMessageNotification(inquiry, msg, 'artist', '刺青師阿志')

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    expect(call.to).toBe('Uconsumer777')
    expect(call.messages[0].text).toContain('刺青師阿志')
    expect(call.messages[0].text).toContain('沒問題！')
  })

  it('uses 傳了一張圖片 as preview for image message type', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist999' }),
    )
    mockPushMessage.mockResolvedValue(undefined)

    const inquiry = makeInquiry()
    const msg = makeMessage({ message_type: 'image', content: null })

    await pushNewMessageNotification(inquiry, msg, 'consumer', '消費者小明')

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    expect(call.messages[0].text).toContain('傳了一張圖片')
  })

  it('uses truncated content as preview for text message type', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist999' }),
    )
    mockPushMessage.mockResolvedValue(undefined)

    const longContent = '我想刺一個很複雜的設計'.repeat(10)
    const inquiry = makeInquiry()
    const msg = makeMessage({ message_type: 'text', content: longContent })

    await pushNewMessageNotification(inquiry, msg, 'consumer', '消費者小明')

    expect(mockPushMessage).toHaveBeenCalledOnce()
    const call = mockPushMessage.mock.calls[0][0]
    const textSent: string = call.messages[0].text
    // Content is truncated to 50 chars, so total text is shorter than original
    expect(textSent.length).toBeLessThan(longContent.length + '消費者小明：'.length)
    expect(textSent).toContain('...')
  })

  it('does nothing when artist has no LINE ID and sender is consumer', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: null }),
    )

    const inquiry = makeInquiry()
    const msg = makeMessage()

    await pushNewMessageNotification(inquiry, msg, 'consumer', '消費者小明')

    expect(mockPushMessage).not.toHaveBeenCalled()
  })

  it('does not throw when pushMessage rejects', async () => {
    mockAdminFrom.mockReturnValue(
      makeThenable({ line_user_id: 'Uartist999' }),
    )
    mockPushMessage.mockRejectedValue(new Error('LINE API error'))

    await expect(
      pushNewMessageNotification(makeInquiry(), makeMessage(), 'consumer', '消費者小明'),
    ).resolves.toBeUndefined()
  })
})
