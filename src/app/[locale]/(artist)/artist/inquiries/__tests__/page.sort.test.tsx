import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InquiriesPage from '../page'
import type { Inquiry } from '@/types/database'
import zhTW from '../../../../../../../messages/zh-TW.json'

// Same next-intl stub as page.test.tsx: resolve labels from the real zh-TW
// messages so both the budget badge (inquiry.budgetRange.options.*) and the
// sort toggle (inquiry.inboxSort.*) render their production copy.
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
    user: { lineUserId: 'artist-line-id', displayName: 'Artist', avatarUrl: null },
  }),
}))

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
    // identical/irrelevant created_at so ordering is driven only by fetch order
    // (recent) or budget rank (budget), never by timestamp.
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Inquiry
}

function mockFetch(inquiries: Inquiry[]) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/inquiries')) {
      return { ok: true, json: async () => ({ data: inquiries }) } as Response
    }
    return { ok: true, json: async () => ({ templates: [] }) } as Response
  }) as typeof fetch
}

// Names double as the row identity we assert order by; the sort toggle/filter
// buttons never contain these strings, so filtering the button set is safe.
const NAMES = ['小低', '小高', '小空', '小中'] as const

/** DOM order of the seeded rows, top-to-bottom. */
function rowOrder(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => NAMES.find((n) => b.textContent?.includes(n)))
    .filter((n): n is (typeof NAMES)[number] => Boolean(n))
}

/** Fetch order (== recent order): under_3k, over_50k, null, 20k_50k. */
function seed(): Inquiry[] {
  return [
    makeInquiry({ id: 'r1', consumer_name: '小低', budget_range: 'under_3k' }),
    makeInquiry({ id: 'r2', consumer_name: '小高', budget_range: 'over_50k' }),
    makeInquiry({ id: 'r3', consumer_name: '小空', budget_range: null }),
    makeInquiry({ id: 'r4', consumer_name: '小中', budget_range: '20k_50k' }),
  ]
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Artist inquiries page — budget sort toggle (HAR-712)', () => {
  it('defaults to recent order (unchanged fetch order)', async () => {
    mockFetch(seed())
    render(<InquiriesPage />)
    await waitFor(() => expect(rowOrder()).toHaveLength(4))

    expect(rowOrder()).toEqual(['小低', '小高', '小空', '小中'])
  })

  it('sorts highest-budget-first with the null row last when toggled to budget', async () => {
    mockFetch(seed())
    render(<InquiriesPage />)
    await waitFor(() => expect(rowOrder()).toHaveLength(4))

    await userEvent.click(
      screen.getByRole('button', { name: zhTW.inquiry.inboxSort.budget }),
    )

    await waitFor(() =>
      // over_50k, 20k_50k, under_3k, then null last
      expect(rowOrder()).toEqual(['小高', '小中', '小低', '小空']),
    )
  })

  it('restores the original recent order when toggled back', async () => {
    mockFetch(seed())
    render(<InquiriesPage />)
    await waitFor(() => expect(rowOrder()).toHaveLength(4))

    await userEvent.click(
      screen.getByRole('button', { name: zhTW.inquiry.inboxSort.budget }),
    )
    await waitFor(() => expect(rowOrder()).toEqual(['小高', '小中', '小低', '小空']))

    await userEvent.click(
      screen.getByRole('button', { name: zhTW.inquiry.inboxSort.recent }),
    )
    await waitFor(() => expect(rowOrder()).toEqual(['小低', '小高', '小空', '小中']))
  })

  it('does not refetch when toggling sort (client-side only)', async () => {
    mockFetch(seed())
    render(<InquiriesPage />)
    await waitFor(() => expect(rowOrder()).toHaveLength(4))

    const inquiryCallsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([input]) => String(input).startsWith('/api/inquiries'),
    ).length

    await userEvent.click(
      screen.getByRole('button', { name: zhTW.inquiry.inboxSort.budget }),
    )
    await waitFor(() => expect(rowOrder()[0]).toBe('小高'))

    const inquiryCallsAfter = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([input]) => String(input).startsWith('/api/inquiries'),
    ).length
    expect(inquiryCallsAfter).toBe(inquiryCallsBefore)
  })
})
