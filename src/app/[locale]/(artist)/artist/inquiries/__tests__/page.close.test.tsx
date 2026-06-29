import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Inquiry } from '@/types/database'

// useAuth → a logged-in artist.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { lineUserId: 'artist-1', displayName: 'A', avatarUrl: null },
  }),
}))

// Heavy realtime + input children: stub so the page renders synchronously and
// the close-lead header (the unit under test) is the only live surface.
vi.mock('@/hooks/useRealtimeMessages', () => ({
  useRealtimeMessages: () => ({
    messages: [],
    isLoading: false,
    sendMessage: vi.fn(),
    refetch: vi.fn(),
  }),
}))
vi.mock('@/components/chat/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}))
vi.mock('@/components/chat/MessageBubble', () => ({ MessageBubble: () => null }))
vi.mock('@/components/chat/QuoteFormModal', () => ({ QuoteFormModal: () => null }))

import InquiriesPage from '../page'

const INQUIRY: Inquiry = {
  id: 'inq-1',
  artist_id: 'artist-1',
  consumer_line_id: 'line-1',
  consumer_name: '小明',
  description: '想刺一隻貓',
  reference_images: [],
  body_part: null,
  size_estimate: null,
  budget_min: null,
  budget_max: null,
  status: 'pending',
  quote_request_id: null,
  created_at: '2026-06-01T00:00:00Z',
}

function mockFetch(closeResponseOk: boolean) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/inquiries?role=artist')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [INQUIRY] }),
      } as Response)
    }
    if (url.includes('/templates')) {
      return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response)
    }
    // The close PATCH.
    if (init?.method === 'PATCH') {
      return Promise.resolve({
        ok: closeResponseOk,
        status: closeResponseOk ? 200 : 500,
        json: async () => ({}),
      } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  })
}

async function renderAndSelect() {
  render(<InquiriesPage />)
  // Wait for the list to load, then click the thread's list button. The
  // consumer name appears twice (avatar initials + name), so target the button.
  const threadButton = await screen.findByRole('button', { name: /想刺一隻貓/ })
  fireEvent.click(threadButton)
}

describe('InquiriesPage close-lead wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('PATCHes /api/inquiries/:id with {status:"closed"} and shows 已關閉 on success', async () => {
    const fetchMock = mockFetch(true)
    vi.stubGlobal('fetch', fetchMock)

    await renderAndSelect()
    fireEvent.click(await screen.findByRole('button', { name: '關閉詢價' }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      )
      expect(patch).toBeTruthy()
      expect(String(patch![0])).toBe('/api/inquiries/inq-1')
      expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({
        status: 'closed',
      })
    })

    // Local state flips to closed → header shows 已關閉, action gone.
    await waitFor(() => expect(screen.getAllByText('已關閉').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: '關閉詢價' })).not.toBeInTheDocument()
  })

  it('shows an error and does NOT mark the lead closed when the PATCH fails', async () => {
    vi.stubGlobal('fetch', mockFetch(false))

    await renderAndSelect()
    fireEvent.click(await screen.findByRole('button', { name: '關閉詢價' }))

    await waitFor(() =>
      expect(screen.getByText('關閉失敗，請稍後再試')).toBeInTheDocument(),
    )
    // Not falsely closed: action still present.
    expect(screen.getByRole('button', { name: '關閉詢價' })).toBeInTheDocument()
  })
})
