import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Message } from '@/types/database'

// ---------------------------------------------------------------------------
// Mock: Supabase client — must be hoisted before the hook import
// ---------------------------------------------------------------------------

const mockRemoveChannel = vi.fn()
const mockSubscribe = vi.fn().mockReturnValue('mock-channel-instance')
let capturedPostgresHandler: ((payload: { new: unknown }) => void) | null = null

const mockOn = vi.fn().mockImplementation(
  (_event: string, _filter: unknown, handler: (payload: { new: unknown }) => void) => {
    capturedPostgresHandler = handler
    return { subscribe: mockSubscribe }
  },
)

const mockChannel = vi.fn().mockReturnValue({ on: mockOn })
const mockSupabase = { channel: mockChannel, removeChannel: mockRemoveChannel }

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// ---------------------------------------------------------------------------
// Import hook AFTER mocks are in place
// ---------------------------------------------------------------------------

import { useRealtimeMessages } from '../useRealtimeMessages'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INQUIRY_ID = 'inquiry-abc-123'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    inquiry_id: INQUIRY_ID,
    sender_type: 'consumer',
    sender_id: 'user-1',
    message_type: 'text',
    content: 'hello',
    metadata: {},
    read_at: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeFetchOk(messages: Message[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ messages }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRealtimeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedPostgresHandler = null
    // Restore default subscribe mock after clearAllMocks
    mockSubscribe.mockReturnValue('mock-channel-instance')
    mockOn.mockImplementation(
      (_event: string, _filter: unknown, handler: (payload: { new: unknown }) => void) => {
        capturedPostgresHandler = handler
        return { subscribe: mockSubscribe }
      },
    )
    mockChannel.mockReturnValue({ on: mockOn })
  })

  // -------------------------------------------------------------------------
  // 1. Initial fetch
  // -------------------------------------------------------------------------

  it('fetches messages on mount with the correct URL', async () => {
    const msg = makeMessage()
    const mockFetch = makeFetchOk([msg])
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith(`/api/inquiries/${INQUIRY_ID}/messages`)
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].id).toBe('msg-1')
  })

  // -------------------------------------------------------------------------
  // 2. Loading state
  // -------------------------------------------------------------------------

  it('isLoading starts true and becomes false after fetch resolves', async () => {
    vi.stubGlobal('fetch', makeFetchOk([]))

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    // Synchronously after render the loading flag is true
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('isLoading becomes false even when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Messages remain empty on error
    expect(result.current.messages).toEqual([])
  })

  // -------------------------------------------------------------------------
  // 3. Null inquiryId
  // -------------------------------------------------------------------------

  it('does not call fetch when inquiryId is null', () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() => useRealtimeMessages(null))

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not subscribe to Supabase when inquiryId is null', () => {
    vi.stubGlobal('fetch', vi.fn())

    renderHook(() => useRealtimeMessages(null))

    expect(mockChannel).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 4. sendMessage — success
  // -------------------------------------------------------------------------

  it('sendMessage sends POST with correct body and appends the saved message', async () => {
    const existingMsg = makeMessage({ id: 'msg-existing' })
    const savedMsg = makeMessage({ id: 'msg-new', content: 'world' })

    const mockFetch = vi.fn()
      // First call: initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [existingMsg] }),
      })
      // Second call: POST sendMessage
      .mockResolvedValueOnce({
        ok: true,
        json: async () => savedMsg,
      })

    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sendMessage('text', 'world')
    })

    // Verify POST request details
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [postUrl, postInit] = mockFetch.mock.calls[1]
    expect(postUrl).toBe(`/api/inquiries/${INQUIRY_ID}/messages`)
    expect(postInit.method).toBe('POST')
    expect(postInit.headers).toMatchObject({ 'Content-Type': 'application/json' })

    const parsedBody = JSON.parse(postInit.body as string)
    expect(parsedBody).toEqual({ message_type: 'text', content: 'world' })

    // Saved message is appended
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].id).toBe('msg-new')
  })

  it('sendMessage sends image type correctly', async () => {
    const savedMsg = makeMessage({ id: 'msg-img', message_type: 'image', content: 'https://example.com/img.jpg' })

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => savedMsg })

    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sendMessage('image', 'https://example.com/img.jpg')
    })

    const parsedBody = JSON.parse(mockFetch.mock.calls[1][1].body as string)
    expect(parsedBody.message_type).toBe('image')
  })

  it('sendMessage throws when POST returns non-ok response', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })

    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.sendMessage('text', 'hello')
      }),
    ).rejects.toThrow('Failed to send message')
  })

  it('sendMessage is a no-op when inquiryId is null', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(null))

    await act(async () => {
      await result.current.sendMessage('text', 'hello')
    })

    // Only the initial fetch guard fires (which also short-circuits); fetch never called
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 5. sendMessage deduplication
  // -------------------------------------------------------------------------

  it('does not add a duplicate message when the saved id already exists in state', async () => {
    const existingMsg = makeMessage({ id: 'msg-dup' })
    // Simulate race: realtime pushed the same message first, then POST returns it
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [existingMsg] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => existingMsg })

    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sendMessage('text', 'hello')
    })

    // Message list stays at 1 — no duplicate
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].id).toBe('msg-dup')
  })

  // -------------------------------------------------------------------------
  // 6. Realtime subscription
  // -------------------------------------------------------------------------

  it('subscribes to the correct Supabase channel on mount', async () => {
    vi.stubGlobal('fetch', makeFetchOk([]))

    renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith(`inquiry:${INQUIRY_ID}`)
    })

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `inquiry_id=eq.${INQUIRY_ID}`,
      }),
      expect.any(Function),
    )

    expect(mockSubscribe).toHaveBeenCalledOnce()
  })

  it('appends a new message received via realtime without duplicating existing ones', async () => {
    const existingMsg = makeMessage({ id: 'msg-existing' })
    const realtimeMsg = makeMessage({ id: 'msg-rt', content: 'realtime!' })

    vi.stubGlobal('fetch', makeFetchOk([existingMsg]))

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.messages).toHaveLength(1)

    act(() => {
      capturedPostgresHandler!({ new: realtimeMsg })
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].id).toBe('msg-rt')
  })

  it('ignores a realtime INSERT whose id is already in the messages list', async () => {
    const existingMsg = makeMessage({ id: 'msg-dupe' })

    vi.stubGlobal('fetch', makeFetchOk([existingMsg]))

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      capturedPostgresHandler!({ new: existingMsg })
    })

    // Still just one message
    expect(result.current.messages).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // 7. Cleanup
  // -------------------------------------------------------------------------

  it('calls supabase.removeChannel on unmount', async () => {
    vi.stubGlobal('fetch', makeFetchOk([]))

    const { unmount } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled()
    })

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith('mock-channel-instance')
  })

  it('does not call removeChannel when inquiryId was null (no channel created)', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { unmount } = renderHook(() => useRealtimeMessages(null))
    unmount()

    expect(mockRemoveChannel).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 8. refetch
  // -------------------------------------------------------------------------

  it('refetch re-calls the messages endpoint and updates state', async () => {
    const firstMsg = makeMessage({ id: 'msg-1' })
    const secondMsg = makeMessage({ id: 'msg-2', content: 'second' })

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [firstMsg] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [firstMsg, secondMsg] }) })

    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.messages).toHaveLength(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].id).toBe('msg-2')
  })

  it('refetch is a no-op when inquiryId is null', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useRealtimeMessages(null))

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 9. messages default
  // -------------------------------------------------------------------------

  it('returns empty messages array when API returns no messages field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    )

    const { result } = renderHook(() => useRealtimeMessages(INQUIRY_ID))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.messages).toEqual([])
  })
})
