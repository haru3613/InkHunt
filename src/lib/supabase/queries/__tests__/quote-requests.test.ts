import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

vi.mock('@/lib/supabase/queries/inquiries', () => ({
  createInquiry: vi.fn(),
}))

import { createQuoteRequest, getQuoteRequestWithQuotes } from '../quote-requests'
import { createInquiry } from '@/lib/supabase/queries/inquiries'

const mockCreateInquiry = vi.mocked(createInquiry)

// Build a chainable Supabase query mock that resolves to `result` at await.
// Each method returns the same chain, and `.single()` resolves to `result`.
function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

const BASE_QUOTE_REQUEST = {
  id: 'qr-001',
  consumer_line_id: 'Uabc123',
  consumer_name: '測試消費者',
  description: '想要一個小幾何圖案在手腕上',
  reference_images: [],
  body_part: '手腕',
  size_estimate: '5x5 cm',
  budget_min: 3000,
  budget_max: 8000,
  status: 'pending' as const,
  created_at: '2025-01-01T00:00:00Z',
}

const BASE_INQUIRY = {
  id: 'inq-001',
  artist_id: 'artist-uuid-1',
  consumer_line_id: 'Uabc123',
  consumer_name: '測試消費者',
  description: '想要一個小幾何圖案在手腕上',
  reference_images: [],
  body_part: '手腕',
  size_estimate: '5x5 cm',
  budget_min: 3000,
  budget_max: 8000,
  status: 'pending' as const,
  quote_request_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const VALID_INPUT = {
  description: '想要一個小幾何圖案在手腕上',
  reference_images: [],
  body_part: '手腕',
  size_estimate: '5x5 cm',
  budget_min: 3000,
  budget_max: 8000,
  artist_ids: ['artist-uuid-1', 'artist-uuid-2'],
}

describe('createQuoteRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns quoteRequest and inquiries on success', async () => {
    // First from() call: insert into quote_requests → .select().single()
    let fromCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quote_requests') {
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      // table === 'inquiries' → update().eq() chain for linking
      fromCallCount++
      return makeThenable({ error: null })
    })

    mockCreateInquiry
      .mockResolvedValueOnce({ inquiry: { ...BASE_INQUIRY, id: 'inq-001' }, messages: [] })
      .mockResolvedValueOnce({ inquiry: { ...BASE_INQUIRY, id: 'inq-002', artist_id: 'artist-uuid-2' }, messages: [] })

    const result = await createQuoteRequest('Uabc123', '測試消費者', VALID_INPUT)

    expect(result.quoteRequest.id).toBe('qr-001')
    expect(result.quoteRequest.status).toBe('pending')
    expect(result.inquiries).toHaveLength(2)
    expect(result.inquiries[0].id).toBe('inq-001')
    expect(result.inquiries[1].id).toBe('inq-002')
  })

  it('calls createInquiry once per artist_id', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quote_requests') {
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      return makeThenable({ error: null })
    })

    mockCreateInquiry
      .mockResolvedValueOnce({ inquiry: { ...BASE_INQUIRY, id: 'inq-001' }, messages: [] })
      .mockResolvedValueOnce({ inquiry: { ...BASE_INQUIRY, id: 'inq-002', artist_id: 'artist-uuid-2' }, messages: [] })

    await createQuoteRequest('Uabc123', '測試消費者', VALID_INPUT)

    expect(mockCreateInquiry).toHaveBeenCalledTimes(2)
    expect(mockCreateInquiry).toHaveBeenCalledWith('Uabc123', '測試消費者', expect.objectContaining({
      artist_id: 'artist-uuid-1',
    }))
    expect(mockCreateInquiry).toHaveBeenCalledWith('Uabc123', '測試消費者', expect.objectContaining({
      artist_id: 'artist-uuid-2',
    }))
  })

  it('accepts null consumerName', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quote_requests') {
        return makeThenable({ data: { ...BASE_QUOTE_REQUEST, consumer_name: null }, error: null })
      }
      return makeThenable({ error: null })
    })

    mockCreateInquiry.mockResolvedValueOnce({ inquiry: BASE_INQUIRY, messages: [] })

    const result = await createQuoteRequest('Uabc123', null, { ...VALID_INPUT, artist_ids: ['artist-uuid-1'] })

    expect(result.quoteRequest.consumer_name).toBeNull()
  })

  it('throws when quote_request insert fails', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'DB constraint violation' } }))

    await expect(
      createQuoteRequest('Uabc123', '測試消費者', VALID_INPUT),
    ).rejects.toThrow('Failed to create quote request: DB constraint violation')
  })

  it('throws when linking inquiry to quote_request fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quote_requests') {
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      // inquiries update link fails
      return makeThenable({ error: { message: 'Foreign key violation' } })
    })

    mockCreateInquiry.mockResolvedValue({ inquiry: BASE_INQUIRY, messages: [] })

    await expect(
      createQuoteRequest('Uabc123', '測試消費者', { ...VALID_INPUT, artist_ids: ['artist-uuid-1'] }),
    ).rejects.toThrow('Failed to link inquiry to quote request: Foreign key violation')
  })
})

describe('getQuoteRequestWithQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns complete data with inquiries and their quotes', async () => {
    const inquiriesWithDetails = [
      {
        ...BASE_INQUIRY,
        artist: {
          id: 'artist-uuid-1',
          slug: 'test-artist',
          display_name: '測試刺青師',
          avatar_url: '/avatar.jpg',
          city: '台北市',
        },
        quotes: [
          {
            id: 'quote-001',
            inquiry_id: 'inq-001',
            artist_id: 'artist-uuid-1',
            price: 5000,
            note: '可以在週末約',
            status: 'pending',
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
      },
    ]

    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        // first call: quote_requests select
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      // second call: inquiries with join select
      return makeThenable({ data: inquiriesWithDetails, error: null })
    })

    const result = await getQuoteRequestWithQuotes('qr-001')

    expect(result).not.toBeNull()
    expect(result!.quoteRequest.id).toBe('qr-001')
    expect(result!.inquiries).toHaveLength(1)
    expect(result!.inquiries[0].artist?.display_name).toBe('測試刺青師')
    expect(result!.inquiries[0].quotes).toHaveLength(1)
    expect(result!.inquiries[0].quotes[0].price).toBe(5000)
  })

  it('returns null when quote request is not found', async () => {
    mockFrom.mockReturnValue(
      makeThenable({ data: null, error: { code: 'PGRST116', message: 'No rows found' } }),
    )

    const result = await getQuoteRequestWithQuotes('nonexistent-id')

    expect(result).toBeNull()
  })

  it('returns empty inquiries array when no inquiries exist', async () => {
    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      return makeThenable({ data: [], error: null })
    })

    const result = await getQuoteRequestWithQuotes('qr-001')

    expect(result).not.toBeNull()
    expect(result!.inquiries).toEqual([])
  })

  it('throws when inquiries fetch fails', async () => {
    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        return makeThenable({ data: BASE_QUOTE_REQUEST, error: null })
      }
      return makeThenable({ data: null, error: { message: 'Connection timeout' } })
    })

    await expect(getQuoteRequestWithQuotes('qr-001')).rejects.toThrow(
      'Failed to fetch inquiries for quote request: Connection timeout',
    )
  })
})
