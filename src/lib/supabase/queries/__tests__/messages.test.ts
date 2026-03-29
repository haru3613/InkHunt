import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockClient } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockClient = { from: mockFrom }
  return { mockFrom, mockClient }
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
  createServerClient: vi.fn().mockResolvedValue(mockClient),
}))

import {
  getUnreadCountsForUser,
  getMessagesByInquiry,
  sendMessage,
  sendSystemMessage,
  markMessagesAsRead,
  getUnreadCountByInquiry,
} from '../messages'

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

const BASE_MESSAGE = {
  id: 'msg-1',
  inquiry_id: 'inq-1',
  sender_type: 'consumer' as const,
  sender_id: 'user-line-id',
  message_type: 'text' as const,
  content: 'Hello',
  metadata: null,
  read_at: null,
  created_at: '2025-01-01T00:00:00Z',
}

describe('getUnreadCountsForUser', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty Map when inquiryIds is empty', async () => {
    const result = await getUnreadCountsForUser('user-1', [])
    expect(result).toEqual(new Map())
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns Map with counts for each inquiry', async () => {
    // Each call to admin.from returns a chain that resolves with { count: 2 }
    mockFrom.mockReturnValue(makeThenable({ count: 2, error: null }))

    const result = await getUnreadCountsForUser('user-1', ['inq-1', 'inq-2'])

    expect(result).toBeInstanceOf(Map)
    expect(result.get('inq-1')).toBe(2)
    expect(result.get('inq-2')).toBe(2)
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('defaults count to 0 when count is null', async () => {
    mockFrom.mockReturnValue(makeThenable({ count: null, error: null }))

    const result = await getUnreadCountsForUser('user-1', ['inq-1'])

    expect(result.get('inq-1')).toBe(0)
  })

  it('uses neq to exclude messages from the requesting user', async () => {
    const chain = makeThenable({ count: 1, error: null })
    mockFrom.mockReturnValue(chain)

    await getUnreadCountsForUser('target-user', ['inq-1'])

    expect(chain.neq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('sender_id', 'target-user')
  })
})

describe('getMessagesByInquiry', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns messages ordered by created_at ascending', async () => {
    const messages = [BASE_MESSAGE, { ...BASE_MESSAGE, id: 'msg-2' }]
    mockFrom.mockReturnValue(makeThenable({ data: messages, error: null }))

    const result = await getMessagesByInquiry('inq-1')

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('msg-1')
    const chain = mockFrom.mock.results[0].value as ReturnType<typeof makeThenable>
    expect(chain.order as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))

    const result = await getMessagesByInquiry('inq-1')

    expect(result).toEqual([])
  })

  it('throws when DB returns an error', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'DB failure' } }))

    await expect(getMessagesByInquiry('inq-1')).rejects.toThrow('Failed to fetch messages: DB failure')
  })
})

describe('sendMessage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('inserts and returns the new message', async () => {
    const chain = makeThenable({ data: BASE_MESSAGE, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await sendMessage('inq-1', 'consumer', 'user-line-id', 'text', 'Hello')

    expect(result).toEqual(BASE_MESSAGE)
    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({
        inquiry_id: 'inq-1',
        sender_type: 'consumer',
        sender_id: 'user-line-id',
        message_type: 'text',
        content: 'Hello',
      }),
    )
  })

  it('supports artist sender_type', async () => {
    const artistMessage = { ...BASE_MESSAGE, sender_type: 'artist' as const }
    const chain = makeThenable({ data: artistMessage, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await sendMessage('inq-1', 'artist', 'artist-line-id', 'image', '/img.jpg')

    expect(result.sender_type).toBe('artist')
    expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ message_type: 'image' }),
    )
  })

  it('throws when insert returns an error', async () => {
    const chain = makeThenable({ data: null, error: { message: 'insert failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(sendMessage('inq-1', 'consumer', 'user-1', 'text', 'Hi')).rejects.toThrow(
      'Failed to send message: insert failed',
    )
  })

  it('throws when data is null with no error', async () => {
    const chain = makeThenable({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(sendMessage('inq-1', 'consumer', 'user-1', 'text', 'Hi')).rejects.toThrow(
      'Failed to send message',
    )
  })
})

describe('sendSystemMessage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('inserts system message with null sender_id and returns it', async () => {
    const systemMessage = {
      ...BASE_MESSAGE,
      sender_type: 'system' as const,
      sender_id: null,
      message_type: 'system' as const,
      content: 'Quote sent',
    }
    const chain = makeThenable({ data: systemMessage, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await sendSystemMessage('inq-1', 'Quote sent')

    expect(result.sender_type).toBe('system')
    expect(result.sender_id).toBeNull()
    expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_type: 'system',
        sender_id: null,
        message_type: 'system',
        content: 'Quote sent',
      }),
    )
  })

  it('passes custom metadata to the insert', async () => {
    const systemMessage = { ...BASE_MESSAGE, sender_type: 'system' as const, message_type: 'system' as const }
    const chain = makeThenable({ data: systemMessage, error: null })
    mockFrom.mockReturnValue(chain)

    const meta = { quote_id: 'q-1', price: 5000 }
    await sendSystemMessage('inq-1', 'Quote sent', meta)

    expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: meta }),
    )
  })

  it('defaults metadata to empty object when not provided', async () => {
    const systemMessage = { ...BASE_MESSAGE, sender_type: 'system' as const, message_type: 'system' as const }
    const chain = makeThenable({ data: systemMessage, error: null })
    mockFrom.mockReturnValue(chain)

    await sendSystemMessage('inq-1', 'status update')

    expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} }),
    )
  })

  it('throws when DB returns an error', async () => {
    const chain = makeThenable({ data: null, error: { message: 'write error' } })
    mockFrom.mockReturnValue(chain)

    await expect(sendSystemMessage('inq-1', 'msg')).rejects.toThrow(
      'Failed to send system message: write error',
    )
  })
})

describe('markMessagesAsRead', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('marks artist and system messages as read when consumer calls it', async () => {
    const chain = makeThenable({ error: null })
    mockFrom.mockReturnValue(chain)

    await markMessagesAsRead('inq-1', 'user-1', 'consumer')

    expect(chain.in as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'sender_type',
      ['artist', 'system'],
    )
  })

  it('marks consumer and system messages as read when artist calls it', async () => {
    const chain = makeThenable({ error: null })
    mockFrom.mockReturnValue(chain)

    await markMessagesAsRead('inq-1', 'artist-1', 'artist')

    expect(chain.in as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'sender_type',
      ['consumer', 'system'],
    )
  })

  it('filters by inquiry_id', async () => {
    const chain = makeThenable({ error: null })
    mockFrom.mockReturnValue(chain)

    await markMessagesAsRead('target-inq', 'user-1', 'consumer')

    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('inquiry_id', 'target-inq')
  })
})

describe('getUnreadCountByInquiry', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns count for consumer (excludes own messages, includes artist+system)', async () => {
    mockFrom.mockReturnValue(makeThenable({ count: 3, error: null }))

    const result = await getUnreadCountByInquiry('inq-1', 'consumer')

    expect(result).toBe(3)
    const chain = mockFrom.mock.results[0].value as ReturnType<typeof makeThenable>
    expect(chain.in as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('sender_type', ['artist', 'system'])
  })

  it('returns count for artist (excludes own messages, includes consumer+system)', async () => {
    mockFrom.mockReturnValue(makeThenable({ count: 5, error: null }))

    const result = await getUnreadCountByInquiry('inq-1', 'artist')

    expect(result).toBe(5)
    const chain = mockFrom.mock.results[0].value as ReturnType<typeof makeThenable>
    expect(chain.in as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('sender_type', ['consumer', 'system'])
  })

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue(makeThenable({ count: null, error: null }))

    const result = await getUnreadCountByInquiry('inq-1', 'consumer')

    expect(result).toBe(0)
  })
})
