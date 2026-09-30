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
      reference_images: ['/api/media/inquiries/550e8400-e29b-41d4-a716-446655440001/ref1.jpg'],
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
        '/api/media/inquiries/550e8400-e29b-41d4-a716-446655440001/1.jpg',
        '/api/media/inquiries/550e8400-e29b-41d4-a716-446655440001/2.jpg',
        '/api/media/inquiries/550e8400-e29b-41d4-a716-446655440001/3.jpg',
        '/api/media/inquiries/550e8400-e29b-41d4-a716-446655440001/4.jpg',
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

  it('rejects reference_images outside the protected media route', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: ['https://example.com/ref.jpg'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects protected reference images owned by a different authenticated user', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: ['/api/media/inquiries/user-b/ref.jpg'],
    }, 'user-a')

    expect(result.success).toBe(false)
  })

  it('accepts protected reference images owned by the authenticated user', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: ['/api/media/inquiries/user-a/ref.jpg'],
    }, 'user-a')

    expect(result.success).toBe(true)
  })

  // HAR-530: budget_range is an optional categorical code. Unknown / absent
  // values coerce to undefined (→ NULL) and must NEVER fail validation.
  it('accepts a valid budget_range code', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_range: '8k_20k',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.budget_range).toBe('8k_20k')
  })

  it('coerces an unknown budget_range to undefined without failing', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_range: 'not_a_real_code',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.budget_range).toBeUndefined()
  })

  it('leaves budget_range undefined when absent', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.budget_range).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Async function tests — Supabase clients are mocked below
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn()
const mockAdminRpc = vi.fn()
const mockAdminClient = { from: mockAdminFrom, rpc: mockAdminRpc }

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

  it('creates the inquiry and initial messages through one transaction RPC', async () => {
    const { createInquiry } = await import('../inquiries')

    const inquiry = makeInquiry()
    const messages = [makeMessage()]
    mockAdminRpc.mockResolvedValueOnce({ data: { inquiry, messages }, error: null })

    const result = await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
    })

    expect(result.inquiry).toEqual(inquiry)
    expect(result.messages).toEqual(messages)
    expect(mockAdminRpc).toHaveBeenCalledWith(
      'create_inquiry_transaction',
      expect.objectContaining({
        p_consumer_line_id: 'U123',
        p_artist_id: '550e8400-e29b-41d4-a716-446655440000',
        p_reference_images: [],
      }),
    )
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('builds summary content with all optional fields when provided', async () => {
    const { createInquiry } = await import('../inquiries')

    mockAdminRpc.mockResolvedValueOnce({
      data: { inquiry: makeInquiry(), messages: [makeMessage()] },
      error: null,
    })

    await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
      budget_min: 3000,
      budget_max: 8000,
    })

    const rpcArgs = mockAdminRpc.mock.calls[0][1] as { p_summary_content: string }
    expect(rpcArgs.p_summary_content).toContain('部位：手臂（前臂）')
    expect(rpcArgs.p_summary_content).toContain('大小：5x5 cm')
    expect(rpcArgs.p_summary_content).toContain('預算：NT$3000 ~ NT$8000')
    expect(rpcArgs.p_summary_content).toContain('I want a small geometric tattoo on my forearm')
  })

  it('threads a valid budget_range code into the transaction RPC', async () => {
    const { createInquiry } = await import('../inquiries')

    mockAdminRpc.mockResolvedValueOnce({
      data: { inquiry: makeInquiry({ budget_range: '8k_20k' }), messages: [makeMessage()] },
      error: null,
    })

    await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
      budget_range: '8k_20k',
    })

    expect(mockAdminRpc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ p_budget_range: '8k_20k' }),
    )
  })

  it('passes null budget_range when it is omitted', async () => {
    const { createInquiry } = await import('../inquiries')

    mockAdminRpc.mockResolvedValueOnce({
      data: { inquiry: makeInquiry(), messages: [makeMessage()] },
      error: null,
    })

    await createInquiry('U123', 'Test User', {
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      reference_images: [],
    })

    expect(mockAdminRpc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ p_budget_range: null }),
    )
  })

  it('maps inactive target rejection to a structured domain error', async () => {
    const { createInquiry, InquiryMutationError } = await import('../inquiries')
    mockAdminRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'INKHUNT_ARTIST_NOT_ACTIVE' },
    })

    const promise = createInquiry('U123', 'Test User', {
        artist_id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'I want a small geometric tattoo on my forearm',
        reference_images: [],
      })
    await expect(promise).rejects.toBeInstanceOf(InquiryMutationError)
    await expect(promise).rejects.toMatchObject({ code: 'ARTIST_NOT_ACTIVE' })
  })

  it('maps self-inquiry rejection to a structured domain error', async () => {
    const { createInquiry } = await import('../inquiries')
    mockAdminRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'INKHUNT_SELF_INQUIRY' },
    })

    await expect(
      createInquiry('U123', 'Test User', {
        artist_id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'I want a small geometric tattoo on my forearm',
        reference_images: [],
      }),
    ).rejects.toMatchObject({ code: 'SELF_INQUIRY' })
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

  it('applies status filter when status is provided', async () => {
    const { getInquiriesForConsumer } = await import('../inquiries')

    const inquiries = [makeInquiry({ status: 'quoted' })]
    const chain = makeThenable({ data: inquiries, count: 1, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    const result = await getInquiriesForConsumer('U123', 'quoted')

    expect(result.data).toEqual(inquiries)
    expect(result.total).toBe(1)
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown]>
    const consumerCall = eqCalls.find(([field]) => field === 'consumer_line_id')
    expect(consumerCall).toBeDefined()
    expect(consumerCall![1]).toBe('U123')
    const statusCall = eqCalls.find(([field]) => field === 'status')
    expect(statusCall).toBeDefined()
    expect(statusCall![1]).toBe('quoted')
  })

  it('does not apply a status filter when status is omitted', async () => {
    const { getInquiriesForConsumer } = await import('../inquiries')

    const chain = makeThenable({ data: [makeInquiry()], count: 1, error: null })
    mockServerFrom.mockReturnValueOnce(chain)

    await getInquiriesForConsumer('U123')

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown]>
    const statusCall = eqCalls.find(([field]) => field === 'status')
    expect(statusCall).toBeUndefined()
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

  it('closes through a transaction RPC with the server-authenticated caller identity', async () => {
    const { updateInquiryStatus } = await import('../inquiries')

    const updated = makeInquiry({ status: 'closed' })
    mockAdminRpc.mockResolvedValueOnce({ data: updated, error: null })

    const result = await updateInquiryStatus('inquiry-uuid-1', 'closed', 'U123')

    expect(result).toEqual(updated)
    expect(result.status).toBe('closed')
    expect(mockAdminRpc).toHaveBeenCalledWith('close_inquiry_transaction', {
      p_inquiry_id: 'inquiry-uuid-1',
      p_caller_line_id: 'U123',
    })
    expect(mockAdminFrom).not.toHaveBeenCalled()
  })

  it('rejects unsupported state transitions before touching the database', async () => {
    const { updateInquiryStatus } = await import('../inquiries')

    await expect(updateInquiryStatus('inquiry-uuid-1', 'quoted', 'U123'))
      .rejects.toMatchObject({ code: 'INVALID_INQUIRY_STATUS' })
    expect(mockAdminRpc).not.toHaveBeenCalled()
  })

  it('maps forbidden closure from the locked database transaction', async () => {
    const { updateInquiryStatus } = await import('../inquiries')
    mockAdminRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'INKHUNT_INQUIRY_FORBIDDEN' },
    })

    await expect(updateInquiryStatus('inquiry-uuid-1', 'closed', 'U-other'))
      .rejects.toMatchObject({ code: 'INQUIRY_FORBIDDEN' })
  })
})
