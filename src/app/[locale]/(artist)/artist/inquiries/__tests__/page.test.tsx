import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InquiriesPage from '../page'
import type { Inquiry } from '@/types/database'
import zhTW from '../../../../../../../messages/zh-TW.json'

// ChatList's StatusBadge now resolves its pill label via useTranslations
// ('inquiry.status.*'). This page test renders the real ChatList without a
// NextIntlClientProvider, so stub next-intl to return the zh-TW label — keeps
// the rendered pill identical to the pre-i18n literal (待回覆 …).
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

// useAuth: logged-in artist user
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { lineUserId: 'artist-line-id', displayName: 'Artist', avatarUrl: null },
  }),
}))

// Heavy children that pull realtime / next-intl — stub so the page renders in jsdom.
vi.mock('@/components/chat/ChatWindow', () => ({
  ChatWindow: () => <div data-testid="chat-window">chat-window</div>,
}))
vi.mock('@/components/chat/QuoteFormModal', () => ({
  QuoteFormModal: () => null,
}))

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inq-1',
    artist_id: 'a-1',
    consumer_line_id: 'c-1',
    consumer_name: '王小明',
    description: '想刺一個小圖',
    reference_images: [],
    body_part: null,
    size_estimate: null,
    budget_min: null,
    budget_max: null,
    status: 'pending',
    quote_request_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Inquiry
}

/** Records every /api/inquiries fetch URL and returns the given inquiries. */
function mockFetch(inquiriesByUrl: (url: string) => Inquiry[]) {
  const calls: string[] = []
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/inquiries')) {
      calls.push(url)
      return {
        ok: true,
        json: async () => ({ data: inquiriesByUrl(url) }),
      } as Response
    }
    // templates and anything else
    return { ok: true, json: async () => ({ templates: [] }) } as Response
  }) as typeof fetch
  return calls
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Artist inquiries page — status filters', () => {
  it('loads all inquiries (no status param) on initial render', async () => {
    const calls = mockFetch(() => [makeInquiry()])
    render(<InquiriesPage />)

    await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument())

    const inquiryCalls = calls.filter((u) => u.startsWith('/api/inquiries'))
    expect(inquiryCalls).toContain('/api/inquiries?role=artist')
    expect(inquiryCalls.every((u) => !u.includes('status='))).toBe(true)
  })

  it('renders all five status filter labels', async () => {
    mockFetch(() => [makeInquiry()])
    render(<InquiriesPage />)

    await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument())

    for (const label of ['全部', '待回覆', '已報價', '已接受', '已關閉']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('selecting 待回覆 refetches with status=pending', async () => {
    const calls = mockFetch((url) =>
      url.includes('status=pending') ? [makeInquiry({ id: 'p-1', consumer_name: '阿明' })] : [makeInquiry()],
    )
    render(<InquiriesPage />)
    await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '待回覆' }))

    await waitFor(() =>
      expect(calls).toContain('/api/inquiries?role=artist&status=pending'),
    )
  })

  it('shows status-specific empty-state copy for an empty filter', async () => {
    const calls = mockFetch((url) => (url.includes('status=') ? [] : [makeInquiry()]))
    render(<InquiriesPage />)
    await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '已關閉' }))

    await waitFor(() => expect(calls.some((u) => u.includes('status=closed'))).toBe(true))
    // 已關閉 empty copy differs from the pending copy
    expect(screen.getByText('目前沒有已關閉的詢價')).toBeInTheDocument()
  })

  it('selecting an inquiry still opens the chat window', async () => {
    mockFetch(() => [makeInquiry()])
    render(<InquiriesPage />)
    await waitFor(() => expect(screen.getByText('王小明')).toBeInTheDocument())

    await userEvent.click(screen.getByText('王小明'))

    expect(screen.getByTestId('chat-window')).toBeInTheDocument()
  })
})
