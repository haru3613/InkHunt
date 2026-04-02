import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateInquiryCreate } from '../inquiries'

describe('validateInquiryCreate', () => {
  it('accepts valid inquiry with all fields', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
      budget_min: 3000,
      budget_max: 8000,
      reference_images: ['https://example.com/ref1.jpg'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid inquiry with only required fields', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
    })
    expect(result.success).toBe(true)
  })

  it('rejects description under 10 chars', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'short',
      body_part: '手臂',
      size_estimate: '5cm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid artist_id (not UUID)', () => {
    const result = validateInquiryCreate({
      artist_id: 'not-a-uuid',
      description: 'I want a detailed sleeve tattoo design',
      body_part: '手臂（上臂）',
      size_estimate: '30x10 cm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid budget range (min > max)', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      body_part: '手臂（上臂）',
      size_estimate: '30x10 cm',
      budget_min: 10000,
      budget_max: 5000,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid budget range (min === max)', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 5000,
      budget_max: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 3 reference images', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects description over 1000 chars', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing artist_id', () => {
    const result = validateInquiryCreate({
      description: 'I want a detailed sleeve tattoo design',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing description', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('defaults reference_images to empty array when not provided', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
    }
  })

  it('allows only budget_min without budget_max', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 3000,
    })
    expect(result.success).toBe(true)
  })

  it('allows only budget_max without budget_min', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_max: 8000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative budget values', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: -1000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer budget values', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 3000.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects reference_images with invalid URLs', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: ['not-a-url'],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Async function tests — Supabase clients are mocked below
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn()
const mockAdminClient = { from: mockAdminFrom }

const mockServerFrom = vi.fn()
const mockServerClient = { from: mockServerFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockAdminClient,
  createServerClient: vi.fn(async () => mockServerClient),
}))

// Builds a fluent query chain where every method returns the chain itself
// and the terminal `.single()` resolves to `result`.
// For multi-row queries the chain itself is thenable (resolves to `result`).
function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => unknown) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

// Minimal fixture factories — only the fields the functions under test actually
// read from the returned objects.
function makeInquiry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inquiry-uuid-1',
    artist_id: '550e8400-e29b-41d4-a716-446655440000',
    consumer_line_id: 'U123',
    consumer_name: 'Test User',
    description: 'I want a small geometric tattoo on my forearm',
    reference_images: [],
    body_part: null,
    size_estimate: null,
    budget_min: null,
    budget_max: null,
    status: 'pending',
    quote_request_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'msg-uuid-1',
    inquiry_id: 'inquiry-uuid-1',
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '新詢價',
    metadata: {},
    read_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('createInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an inquiry and returns inquiry + messages on success', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiry = makeInquiry()
    const messages = [makeMessage()]

    // First admin.from() call is for 'inquiries' insert
    const inquiryChain = makeThenable({ data: inquiry, error: null })
    // Second admin.from() call is for 'messages' insert
    const messagesChain = makeThenable({ data: messages, error: null })

    mockAdminFrom
      .mockReturnValueOnce(inquiryChain)
      .mockReturnValueOnce(messagesChain)

    const result = await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
    })

    expect(result.inquiry).toEqual(inquiry)
    expect(result.messages).toEqual(messages)
    expect(mockAdminFrom).toHaveBeenCalledWith('inquiries')
    expect(mockAdminFrom).toHaveBeenCalledWith('messages')
  })

  it('creates image messages for each reference_image', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiry = makeInquiry({ id: 'inquiry-uuid-2' })
    const imageMessages = [
      makeMessage({ message_type: 'image', content: 'https://example.com/1.jpg' }),
      makeMessage({ message_type: 'image', content: 'https://example.com/2.jpg' }),
    ]

    const inquiryChain = makeThenable({ data: inquiry, error: null })
    const messagesChain = makeThenable({ data: imageMessages, error: null })

    mockAdminFrom
      .mockReturnValueOnce(inquiryChain)
      .mockReturnValueOnce(messagesChain)

    const result = await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ],
    })

    // The messages insert chain receives the payload; verify the image messages
    // chain was invoked (insert was called on the messages chain).
    const messagesInsertFn = (messagesChain.insert as ReturnType<typeof vi.fn>)
    expect(messagesInsertFn).toHaveBeenCalledOnce()
    const insertedMessages = messagesInsertFn.mock.calls[0][0] as Array<{ message_type: string; content: string }>
    const imageEntries = insertedMessages.filter((m) => m.message_type === 'image')
    expect(imageEntries).toHaveLength(2)
    expect(imageEntries[0].content).toBe('https://example.com/1.jpg')
    expect(imageEntries[1].content).toBe('https://example.com/2.jpg')
    expect(result.messages).toEqual(imageMessages)
  })

  it('builds summary content with all optional fields when provided', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiry = makeInquiry({
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
      budget_min: 3000,
      budget_max: 8000,
    })
    const messages = [makeMessage()]

    const inquiryChain = makeThenable({ data: inquiry, error: null })
    const messagesChain = makeThenable({ data: messages, error: null })

    mockAdminFrom
      .mockReturnValueOnce(inquiryChain)
      .mockReturnValueOnce(messagesChain)

    await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
      budget_min: 3000,
      budget_max: 8000,
    })

    const insertedMessages = (messagesChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Array<{ content: string }>
    const systemMessage = insertedMessages[0]
    expect(systemMessage.content).toContain('部位：手臂（前臂）')
    expect(systemMessage.content).toContain('大小：5x5 cm')
    expect(systemMessage.content).toContain('預算：NT$3000 ~ NT$8000')
    expect(systemMessage.content).toContain('I want a small geometric tattoo on my forearm')
  })

  it('throws when the inquiry insert fails', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiryChain = makeThenable({ data: null, error: { message: 'insert failed' } })
    mockAdminFrom.mockReturnValueOnce(inquiryChain)

    await expect(
      createInquiry('U123', 'Test User', {
        artist_id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'I want a small geometric tattoo on my forearm',
        reference_images: [],
      }),
    ).rejects.toThrow('Failed to create inquiry: insert failed')
  })

  it('throws when the messages insert fails', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiry = makeInquiry()
    const inquiryChain = makeThenable({ data: inquiry, error: null })
    const messagesChain = makeThenable({ data: null, error: { message: 'msg insert failed' } })

    mockAdminFrom
      .mockReturnValueOnce(inquiryChain)
      .mockReturnValueOnce(messagesChain)

    await expect(
      createInquiry('U123', 'Test User', {
        artist_id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'I want a small geometric tattoo on my forearm',
        reference_images: [],
      }),
    ).rejects.toThrow('Failed to create initial messages: msg insert failed')
  })
})

describe('getInquiriesForArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated data and total count', async () => {
    const { getInquiriesForArtist } = await import('../inquiries')

    const inquiries = [makeInquiry(), makeInquiry({ id: 'inquiry-uuid-2' })]
    const chain = makeThenable({ data: inquiries, count: 2, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForArtist('artist-uuid-1')

    expect(result.data).toEqual(inquiries)
    expect(result.total).toBe(2)
    expect(mockServerFrom).toHaveBeenCalledWith('inquiries')
  })

  it('applies status filter when status is provided', async () => {
    const { getInquiriesForArtist } = await import('../inquiries')

    const inquiries = [makeInquiry({ status: 'quoted' })]
    const chain = makeThenable({ data: inquiries, count: 1, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForArtist('artist-uuid-1', 'quoted')

    expect(result.data).toEqual(inquiries)
    expect(result.total).toBe(1)
    // The status eq() call is chained after the initial setup; the chain's eq
    // mock should have been called with the status argument.
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown]>
    const statusCall = eqCalls.find(([field]) => field === 'status')
    expect(statusCall).toBeDefined()
    expect(statusCall![1]).toBe('quoted')
  })

  it('throws when the query returns an error', async () => {
    const { getInquiriesForArtist } = await import('../inquiries')

    const chain = makeThenable({ data: null, count: null, error: { message: 'db error' } })
    mockServerFrom.mockReturnValueOnce(chain)

    await expect(getInquiriesForArtist('artist-uuid-1')).rejects.toThrow(
      'Failed to fetch inquiries: db error',
    )
  })

  it('returns empty data and zero total when db returns nulls', async () => {
    const { getInquiriesForArtist } = await import('../inquiries')

    const chain = makeThenable({ data: null, count: null, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForArtist('artist-uuid-1')

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('getInquiriesForConsumer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated data and total count', async () => {
    const { getInquiriesForConsumer } = await import('../inquiries')

    const inquiries = [makeInquiry()]
    const chain = makeThenable({ data: inquiries, count: 1, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForConsumer('U123')

    expect(result.data).toEqual(inquiries)
    expect(result.total).toBe(1)
    expect(mockServerFrom).toHaveBeenCalledWith('inquiries')
  })

  it('throws when the query returns an error', async () => {
    const { getInquiriesForConsumer } = await import('../inquiries')

    const chain = makeThenable({ data: null, count: null, error: { message: 'network error' } })
    mockServerFrom.mockReturnValueOnce(chain)

    await expect(getInquiriesForConsumer('U123')).rejects.toThrow(
      'Failed to fetch inquiries: network error',
    )
  })

  it('returns empty data and zero total when db returns nulls', async () => {
    const { getInquiriesForConsumer } = await import('../inquiries')

    const chain = makeThenable({ data: null, count: null, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForConsumer('U123')

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('getInquiryById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the inquiry when found', async () => {
    const { getInquiryById } = await import('../inquiries')

    const inquiry = makeInquiry()
    const chain = makeThenable({ data: inquiry, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiryById('inquiry-uuid-1')

    expect(result).toEqual(inquiry)
    expect(mockServerFrom).toHaveBeenCalledWith('inquiries')
  })

  it('returns null when the inquiry is not found', async () => {
    const { getInquiryById } = await import('../inquiries')

    const chain = makeThenable({ data: null, error: { message: 'not found', code: 'PGRST116' } })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiryById('nonexistent-id')

    expect(result).toBeNull()
  })
})

describe('updateInquiryStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates status and returns the updated inquiry', async () => {
    const { updateInquiryStatus } = await import('../inquiries')

    const updated = makeInquiry({ status: 'quoted' })
    const chain = makeThenable({ data: updated, error: null })
    mockAdminFrom.mockReturnValueOnce(chain)

    const result = await updateInquiryStatus('inquiry-uuid-1', 'quoted')

    expect(result).toEqual(updated)
    expect(result.status).toBe('quoted')
    expect(mockAdminFrom).toHaveBeenCalledWith('inquiries')
  })

  it('throws when the update returns an error', async () => {
    const { updateInquiryStatus } = await import('../inquiries')

    const chain = makeThenable({ data: null, error: { message: 'update failed' } })
    mockAdminFrom.mockReturnValueOnce(chain)

    await expect(updateInquiryStatus('inquiry-uuid-1', 'closed')).rejects.toThrow(
      'Failed to update inquiry: update failed',
    )
  })

  it('throws when the update returns null data without an error', async () => {
    const { updateInquiryStatus } = await import('../inquiries')

    const chain = makeThenable({ data: null, error: null })
    mockAdminFrom.mockReturnValueOnce(chain)

    await expect(updateInquiryStatus('inquiry-uuid-1', 'closed')).rejects.toThrow(
      'Failed to update inquiry',
    )
  })
})
