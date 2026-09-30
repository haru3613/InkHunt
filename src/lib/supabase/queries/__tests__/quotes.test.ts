import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockClient = { from: mockFrom, rpc: mockRpc }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

import {
  validateQuoteCreate,
  createQuote,
  respondToQuote,
  markQuoteViewed,
  QuoteMutationError,
} from '../quotes'

function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (value: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

const BASE_QUOTE = {
  id: 'quote-1',
  inquiry_id: 'inq-1',
  artist_id: 'artist-1',
  price: 5000,
  note: 'Fine line only',
  available_dates: '2026-10-08, 2026-10-15',
  status: 'sent' as const,
  created_at: '2026-10-01T00:00:00Z',
}

const BASE_MESSAGE = {
  id: 'msg-1',
  inquiry_id: 'inq-1',
  sender_type: 'artist' as const,
  sender_id: 'artist-line-id',
  message_type: 'quote' as const,
  content: '報價 NT$5,000',
  metadata: {
    quote_id: 'quote-1',
    price: 5000,
    note: 'Fine line only',
    available_dates: ['2026-10-08', '2026-10-15'],
    status: 'sent',
  },
  read_at: null,
  created_at: '2026-10-01T00:00:00Z',
}

describe('validateQuoteCreate', () => {
  it('accepts valid input with all fields', () => {
    expect(validateQuoteCreate({
      price: 5000,
      note: 'Fine line',
      available_dates: ['2026-10-08', '2026-10-15'],
    }).success).toBe(true)
  })

  it('accepts valid input with only price', () => {
    expect(validateQuoteCreate({ price: 1000 }).success).toBe(true)
  })

  it.each([0, -100, 1500.5])('rejects invalid price %s', (price) => {
    expect(validateQuoteCreate({ price }).success).toBe(false)
  })

  it('rejects oversized note and date list', () => {
    expect(validateQuoteCreate({ price: 1000, note: 'a'.repeat(501) }).success).toBe(false)
    expect(validateQuoteCreate({
      price: 1000,
      available_dates: Array.from({ length: 11 }, (_, index) => `2026-10-${index + 1}`),
    }).success).toBe(false)
  })
})

describe('createQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates quote, message, and inquiry transition through one transaction RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { quote: BASE_QUOTE, message: BASE_MESSAGE },
      error: null,
    })

    const result = await createQuote('inq-1', 'artist-1', 'artist-line-id', {
      price: 5000,
      note: 'Fine line only',
      available_dates: ['2026-10-08', '2026-10-15'],
    })

    expect(result).toEqual({ quote: BASE_QUOTE, message: BASE_MESSAGE })
    expect(mockRpc).toHaveBeenCalledWith('create_quote_transaction', {
      p_inquiry_id: 'inq-1',
      p_artist_id: 'artist-1',
      p_sender_line_id: 'artist-line-id',
      p_price: 5000,
      p_note: 'Fine line only',
      p_available_dates: '2026-10-08, 2026-10-15',
      p_available_dates_json: ['2026-10-08', '2026-10-15'],
      p_message_content: '報價 NT$5,000',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('maps inactive artist and closed inquiry failures', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'INKHUNT_ARTIST_NOT_ACTIVE' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'INKHUNT_INQUIRY_NOT_OPEN' } })

    await expect(createQuote('inq-1', 'artist-1', 'artist-line-id', { price: 5000 }))
      .rejects.toMatchObject({ code: 'ARTIST_NOT_ACTIVE' })
    await expect(createQuote('inq-1', 'artist-1', 'artist-line-id', { price: 5000 }))
      .rejects.toMatchObject({ code: 'INQUIRY_NOT_OPEN' })
  })
})

describe('respondToQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes server-authenticated consumer identity to the transaction RPC', async () => {
    const acceptedQuote = { ...BASE_QUOTE, status: 'accepted' as const }
    mockRpc.mockResolvedValueOnce({ data: acceptedQuote, error: null })

    const result = await respondToQuote(
      'quote-1',
      'inq-1',
      'accepted',
      'consumer-line-id',
    )

    expect(result).toEqual(acceptedQuote)
    expect(mockRpc).toHaveBeenCalledWith('respond_to_quote_transaction', {
      p_quote_id: 'quote-1',
      p_inquiry_id: 'inq-1',
      p_consumer_line_id: 'consumer-line-id',
      p_status: 'accepted',
    })
  })

  it('returns null when the quote does not belong to the inquiry', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })
    await expect(respondToQuote(
      'other-quote',
      'inq-1',
      'accepted',
      'consumer-line-id',
    )).resolves.toBeNull()
  })

  it.each([
    ['INKHUNT_INQUIRY_NOT_OPEN', 'INQUIRY_NOT_OPEN'],
    ['INKHUNT_QUOTE_NOT_ACTIONABLE', 'QUOTE_NOT_ACTIONABLE'],
    ['INKHUNT_QUOTE_FORBIDDEN', 'QUOTE_FORBIDDEN'],
  ])('maps %s to %s', async (databaseMessage, code) => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: databaseMessage } })
    const promise = respondToQuote('quote-1', 'inq-1', 'accepted', 'consumer-line-id')
    await expect(promise).rejects.toBeInstanceOf(QuoteMutationError)
    await expect(promise).rejects.toMatchObject({ code })
  })
})

describe('markQuoteViewed', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only moves a sent quote for the scoped inquiry to viewed', async () => {
    const viewedQuote = { ...BASE_QUOTE, status: 'viewed' as const }
    const chain = makeThenable({ data: viewedQuote, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(markQuoteViewed('quote-1', 'inq-1')).resolves.toEqual(viewedQuote)
    expect(chain.update as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ status: 'viewed' })
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('id', 'quote-1')
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('inquiry_id', 'inq-1')
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('status', 'sent')
  })

  it('returns null when the quote is already viewed or no longer actionable', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))
    await expect(markQuoteViewed('quote-1', 'inq-1')).resolves.toBeNull()
  })
})
