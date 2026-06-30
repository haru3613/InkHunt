import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConsumerInquiriesPage from '../page'
import type { Inquiry } from '@/types/database'

// useRouter: capture push() so we can assert navigation on row select.
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

// next-intl: return the key itself so chips/empty-copy render a stable,
// assertable string (same shape as InquiryForm.test.tsx).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// useAuth: logged-in consumer.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isLoading: false,
    loginWithRedirect: vi.fn(),
  }),
}))

// The consumer /api/inquiries payload is an Inquiry row plus the joined
// artist_display_name the list row renders.
type ConsumerInquiry = Inquiry & { artist_display_name: string }

function makeInquiry(overrides: Partial<ConsumerInquiry> = {}): ConsumerInquiry {
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
    artist_display_name: '刺青師阿明',
    ...overrides,
  } as ConsumerInquiry
}

/** Records every /api/inquiries fetch URL and returns the inquiries the callback yields. */
function mockFetch(inquiriesByUrl: (url: string) => ConsumerInquiry[]) {
  const calls: string[] = []
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.startsWith('/api/inquiries')) {
      calls.push(url)
      return { ok: true, json: async () => ({ data: inquiriesByUrl(url) }) } as Response
    }
    return { ok: true, json: async () => ({}) } as Response
  }) as typeof fetch
  return calls
}

beforeEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
})

describe('Consumer inquiries page — status filters', () => {
  it('loads consumer inquiries (no status param) on initial render', async () => {
    const calls = mockFetch(() => [makeInquiry()])
    render(<ConsumerInquiriesPage />)

    await waitFor(() => expect(screen.getByText('刺青師阿明')).toBeInTheDocument())

    const inquiryCalls = calls.filter((u) => u.startsWith('/api/inquiries'))
    expect(inquiryCalls).toContain('/api/inquiries?role=consumer')
    expect(inquiryCalls.every((u) => !u.includes('status='))).toBe(true)

    // Active-filter label + result count render in the header.
    expect(screen.getByText('filters.all · 1')).toBeInTheDocument()
  })

  it('renders all five localized status filter chips', async () => {
    mockFetch(() => [makeInquiry()])
    render(<ConsumerInquiriesPage />)

    await waitFor(() => expect(screen.getByText('刺青師阿明')).toBeInTheDocument())

    for (const key of [
      'filters.all',
      'filters.pending',
      'filters.quoted',
      'filters.accepted',
      'filters.closed',
    ]) {
      expect(screen.getByRole('button', { name: key })).toBeInTheDocument()
    }
  })

  it('clicking 待回覆 refetches with role=consumer&status=pending', async () => {
    const calls = mockFetch((url) =>
      url.includes('status=pending')
        ? [makeInquiry({ id: 'p-1', artist_display_name: '阿明師' })]
        : [makeInquiry()],
    )
    render(<ConsumerInquiriesPage />)
    await waitFor(() => expect(screen.getByText('刺青師阿明')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'filters.pending' }))

    await waitFor(() =>
      expect(calls).toContain('/api/inquiries?role=consumer&status=pending'),
    )
  })

  it('shows status-specific localized empty copy for an empty filter', async () => {
    const calls = mockFetch((url) => (url.includes('status=') ? [] : [makeInquiry()]))
    render(<ConsumerInquiriesPage />)
    await waitFor(() => expect(screen.getByText('刺青師阿明')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'filters.closed' }))

    await waitFor(() => expect(calls.some((u) => u.includes('status=closed'))).toBe(true))
    // The closed empty copy is distinct from the all-empty copy.
    expect(screen.getByText('filters.emptyClosed')).toBeInTheDocument()
    expect(screen.queryByText('filters.emptyAll')).not.toBeInTheDocument()
  })

  it('selecting an inquiry navigates to /inquiries/:id', async () => {
    mockFetch(() => [makeInquiry({ id: 'inq-42' })])
    render(<ConsumerInquiriesPage />)
    await waitFor(() => expect(screen.getByText('刺青師阿明')).toBeInTheDocument())

    await userEvent.click(screen.getByText('刺青師阿明'))

    expect(push).toHaveBeenCalledWith('/inquiries/inq-42')
  })
})
