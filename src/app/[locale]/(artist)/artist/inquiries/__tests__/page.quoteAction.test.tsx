import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { Inquiry } from '@/types/database'
import zhTW from '../../../../../../../messages/zh-TW.json'

/**
 * HAR-666: page.test.tsx (filters) and page.close.test.tsx (close-lead) don't
 * exercise handleQuoteAction (accept/reject a quote) or the mobile
 * back-to-list button — both were 0% covered on ChatWindow's onQuoteAction /
 * back-nav wiring.
 */

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const scope = namespace
      .split('.')
      .reduce<Record<string, unknown>>(
        (acc, part) => (acc?.[part] as Record<string, unknown>) ?? {},
        zhTW as unknown as Record<string, unknown>,
      )
    return (scope as Record<string, string>)[key] ?? `${namespace}.${key}`
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { lineUserId: 'artist-1', displayName: 'A', avatarUrl: null },
  }),
}))

let capturedOnQuoteAction:
  | ((quoteId: string, action: 'accepted' | 'rejected') => Promise<void>)
  | undefined

vi.mock('@/components/chat/ChatWindow', () => ({
  ChatWindow: ({
    onQuoteAction,
  }: {
    onQuoteAction: (quoteId: string, action: 'accepted' | 'rejected') => Promise<void>
  }) => {
    capturedOnQuoteAction = onQuoteAction
    return <div data-testid="chat-window">chat-window</div>
  },
}))
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

function mockFetch(patchOk: boolean) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/inquiries?role=artist')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [INQUIRY] }) } as Response)
    }
    if (url.includes('/templates')) {
      return Promise.resolve({ ok: true, json: async () => ({ templates: [] }) } as Response)
    }
    if (init?.method === 'PATCH' && url.includes('/quotes')) {
      return Promise.resolve({ ok: patchOk, status: patchOk ? 200 : 500 } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  })
}

async function renderAndSelect() {
  render(<InquiriesPage />)
  const threadButton = await screen.findByRole('button', { name: /想刺一隻貓/ })
  fireEvent.click(threadButton)
  await waitFor(() => expect(capturedOnQuoteAction).toBeDefined())
}

describe('InquiriesPage quote action wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    capturedOnQuoteAction = undefined
  })

  it('PATCHes /api/inquiries/:id/quotes with the quote id + accepted status', async () => {
    const fetchMock = mockFetch(true)
    vi.stubGlobal('fetch', fetchMock)
    await renderAndSelect()

    await capturedOnQuoteAction!('quote-1', 'accepted')

    const patch = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
    )
    expect(patch).toBeTruthy()
    expect(String(patch![0])).toBe('/api/inquiries/inq-1/quotes')
    expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({
      quote_id: 'quote-1',
      status: 'accepted',
    })
  })

  it('throws when the quote PATCH fails so the caller can surface an error', async () => {
    vi.stubGlobal('fetch', mockFetch(false))
    await renderAndSelect()

    await expect(capturedOnQuoteAction!('quote-1', 'rejected')).rejects.toThrow(
      'Quote action failed: 500',
    )
  })

  it('returns to the thread list when the mobile back button is clicked', async () => {
    vi.stubGlobal('fetch', mockFetch(true))
    await renderAndSelect()

    expect(screen.getByTestId('chat-window')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回列表' }))

    expect(screen.queryByTestId('chat-window')).not.toBeInTheDocument()
    expect(screen.getByText('想刺一隻貓')).toBeInTheDocument()
  })
})
