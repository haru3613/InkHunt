import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

import {
  validateQuoteCreate,
  createQuote,
  respondToQuote,
  markQuoteViewed,
} from '../quotes'

function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.limit = vi.fn().mockResolvedValue(result)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.lt = vi.fn().mockReturnValue(chain)
  return chain
}

const BASE_QUOTE = {
  id: 'quote-1',
  inquiry_id: 'inq-1',
  artist_id: 'artist-1',
  price: 5000,
  note: 'Fine line only',
  available_dates: '2025-03-01, 2025-03-08',
  status: 'sent' as const,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const BASE_MESSAGE = {
  id: 'msg-1',
  inquiry_id: 'inq-1',
  sender_type: 'artist' as const,
  sender_id: 'artist-line-id',
  message_type: 'quote' as const,
  content: '報價 NT$5,000',
  metadata: { quote_id: 'quote-1', price: 5000, note: null, available_dates: null, status: 'sent' },
  read_at: null,
  created_at: '2025-01-01T00:00:00Z',
}

describe('validateQuoteCreate', () => {
  it('accepts valid input with all fields', () => {
    const result = validateQuoteCreate({
      price: 5000,
      note: 'Fine line',
      available_dates: ['2025-03-01', '2025-03-08'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price).toBe(5000)
      expect(result.data.note).toBe('Fine line')
    }
  })

  it('accepts valid input with only price (optional fields omitted)', () => {
    const result = validateQuoteCreate({ price: 1000 })
    expect(result.success).toBe(true)
  })

  it('rejects price of zero', () => {
    const result = validateQuoteCreate({ price: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Price must be positive')
    }
  })

  it('rejects negative price', () => {
    const result = validateQuoteCreate({ price: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer price', () => {
    const result = validateQuoteCreate({ price: 1500.5 })
    expect(result.success).toBe(false)
  })

  it('rejects note longer than 500 characters', () => {
    const result = validateQuoteCreate({ price: 1000, note: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('rejects available_dates array with more than 10 items', () => {
    const result = validateQuoteCreate({
      price: 1000,
      available_dates: Array.from({ length: 11 }, (_, i) => `2025-0${(i % 9) + 1}-01`),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing price entirely', () => {
    const result = validateQuoteCreate({ note: 'No price given' })
    expect(result.success).toBe(false)
  })
})

describe('createQuote', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('inserts quote and message, then updates inquiry status, returns both', async () => {
    let callNum = 0
    mockFrom.mockImplementation((table: string) => {
      callNum++
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      if (table === 'messages') return makeThenable({ data: BASE_MESSAGE, error: null })
      // inquiries update — third call
      return makeThenable({ data: null, error: null })
    })

    const result = await createQuote('inq-1', 'artist-1', 'artist-line-id', {
      price: 5000,
      note: 'Fine line only',
      available_dates: ['2025-03-01', '2025-03-08'],
    })

    expect(result.quote).toEqual(BASE_QUOTE)
    expect(result.message).toEqual(BASE_MESSAGE)
    expect(callNum).toBe(3)
  })

  it('formats price in message content with toLocaleString', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      if (table === 'messages') return makeThenable({ data: BASE_MESSAGE, error: null })
      return makeThenable({ data: null, error: null })
    })

    await createQuote('inq-1', 'artist-1', 'artist-line-id', { price: 5000 })

    const messageChain = mockFrom.mock.results[1].value as ReturnType<typeof makeThenable>
    const insertCall = (messageChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(insertCall.content).toBe('報價 NT$5,000')
  })

  it('uses null for note and available_dates when not provided', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      if (table === 'messages') return makeThenable({ data: BASE_MESSAGE, error: null })
      return makeThenable({ data: null, error: null })
    })

    await createQuote('inq-1', 'artist-1', 'sender-id', { price: 3000 })

    const quoteChain = mockFrom.mock.results[0].value as ReturnType<typeof makeThenable>
    const quoteInsertArg = (quoteChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(quoteInsertArg.note).toBeNull()
    expect(quoteInsertArg.available_dates).toBeNull()
  })

  it('throws when quote insert fails', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'constraint violation' } }))

    await expect(
      createQuote('inq-1', 'artist-1', 'sender-id', { price: 5000 }),
    ).rejects.toThrow('Failed to create quote: constraint violation')
  })

  it('throws when message insert fails', async () => {
    let callNum = 0
    mockFrom.mockImplementation((table: string) => {
      callNum++
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      return makeThenable({ data: null, error: { message: 'message insert error' } })
    })

    await expect(
      createQuote('inq-1', 'artist-1', 'sender-id', { price: 5000 }),
    ).rejects.toThrow('Failed to create quote message: message insert error')
  })
})

describe('respondToQuote', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates quote status to accepted and inserts system message and updates inquiry', async () => {
    const acceptedQuote = { ...BASE_QUOTE, status: 'accepted' as const }
    let callNum = 0
    mockFrom.mockImplementation((table: string) => {
      callNum++
      if (table === 'quotes') return makeThenable({ data: acceptedQuote, error: null })
      // messages insert (system message) — second call
      if (table === 'messages') return makeThenable({ data: null, error: null })
      // inquiries update — third call (only for accepted)
      return makeThenable({ data: null, error: null })
    })

    const result = await respondToQuote('quote-1', 'inq-1', 'accepted')

    expect(result.status).toBe('accepted')
    expect(callNum).toBe(3)
    const quotesChain = mockFrom.mock.results[0].value as ReturnType<typeof makeThenable>
    expect(quotesChain.update as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ status: 'accepted' })
  })

  it('updates quote status to rejected but does NOT update inquiry', async () => {
    const rejectedQuote = { ...BASE_QUOTE, status: 'rejected' as const }
    let callNum = 0
    mockFrom.mockImplementation((table: string) => {
      callNum++
      if (table === 'quotes') return makeThenable({ data: rejectedQuote, error: null })
      return makeThenable({ data: null, error: null })
    })

    const result = await respondToQuote('quote-1', 'inq-1', 'rejected')

    expect(result.status).toBe('rejected')
    // Only quotes + messages — no inquiries update for rejection
    expect(callNum).toBe(2)
  })

  it('inserts correct system message text for accepted', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      return makeThenable({ data: null, error: null })
    })

    await respondToQuote('quote-1', 'inq-1', 'accepted')

    const msgChain = mockFrom.mock.results[1].value as ReturnType<typeof makeThenable>
    const insertArg = (msgChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(insertArg.content).toBe('已接受報價')
  })

  it('inserts correct system message text for rejected', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quotes') return makeThenable({ data: BASE_QUOTE, error: null })
      return makeThenable({ data: null, error: null })
    })

    await respondToQuote('quote-1', 'inq-1', 'rejected')

    const msgChain = mockFrom.mock.results[1].value as ReturnType<typeof makeThenable>
    const insertArg = (msgChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(insertArg.content).toBe('已拒絕報價')
  })

  it('throws when quote update fails', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'update error' } }))

    await expect(respondToQuote('quote-1', 'inq-1', 'accepted')).rejects.toThrow(
      'Failed to update quote: update error',
    )
  })
})

describe('markQuoteViewed', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates status to viewed and returns the quote when found', async () => {
    const viewedQuote = { ...BASE_QUOTE, status: 'viewed' as const }
    const chain = makeThenable({ data: viewedQuote, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await markQuoteViewed('quote-1', 'inq-1')

    expect(result).toEqual(viewedQuote)
    expect(chain.update as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({ status: 'viewed' })
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('id', 'quote-1')
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('inquiry_id', 'inq-1')
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('status', 'sent')
  })

  it('returns null when no matching quote found (already viewed or wrong status)', async () => {
    const chain = makeThenable({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await markQuoteViewed('quote-1', 'inq-1')

    expect(result).toBeNull()
  })
})
