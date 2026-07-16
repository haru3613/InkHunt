import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const authState = vi.hoisted(() => ({
  isLoggedIn: true,
  isLoading: false,
  loginWithRedirect: vi.fn(),
}))

const mockPush = vi.fn()
const searchParamsState = vi.hoisted(() => ({
  artists: 'id-1,id-2',
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) =>
      key === 'artists' ? searchParamsState.artists : null,
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, number>) =>
    values ? `${ns}.${key}:${JSON.stringify(values)}` : `${ns}.${key}`,
}))

vi.mock('@/components/inquiry/ReferenceImageUpload', () => ({
  ReferenceImageUpload: () => <div data-testid="ref-upload" />,
}))

// Select is complex; stub to a simple control that still fires onValueChange
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (v: string) => void
    value?: string
  }) => (
    <div data-testid="select" data-value={value}>
      <button type="button" onClick={() => onValueChange?.('手臂')}>
        pick-body
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import NewQuoteRequestPage from '../page'

describe('NewQuoteRequestPage', () => {
  beforeEach(() => {
    authState.isLoggedIn = true
    authState.isLoading = false
    authState.loginWithRedirect.mockReset()
    mockPush.mockReset()
    searchParamsState.artists = 'id-1,id-2'
    vi.unstubAllGlobals()
  })

  it('shows empty state when no artists selected', () => {
    searchParamsState.artists = ''
    render(<NewQuoteRequestPage />)
    expect(screen.getByText('compare.noArtistsSelected')).toBeInTheDocument()
  })

  it('renders form for selected artists', () => {
    render(<NewQuoteRequestPage />)
    expect(
      screen.getByText(/compare.sendInquiryTo/),
    ).toBeInTheDocument()
    expect(screen.getByTestId('ref-upload')).toBeInTheDocument()
  })

  it('redirects to login when not logged in on submit', async () => {
    authState.isLoggedIn = false
    const user = userEvent.setup()
    render(<NewQuoteRequestPage />)

    await user.type(
      screen.getByLabelText(/inquiry.description/),
      '這是一段足夠長的詢價描述內容',
    )
    await user.click(screen.getByRole('button', { name: 'pick-body' }))
    await user.type(screen.getByLabelText(/inquiry.sizeEstimate/), '10cm')
    await user.click(screen.getByRole('button', { name: /compare.loginToInquire/ }))

    expect(authState.loginWithRedirect).toHaveBeenCalled()
  })

  it('submits quote request and navigates to detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'qr-99' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<NewQuoteRequestPage />)

    await user.type(
      screen.getByLabelText(/inquiry.description/),
      '這是一段足夠長的詢價描述內容',
    )
    await user.click(screen.getByRole('button', { name: 'pick-body' }))
    await user.type(screen.getByLabelText(/inquiry.sizeEstimate/), '10cm')
    await user.type(screen.getByPlaceholderText('inquiry.budgetMin'), '3000')
    await user.type(screen.getByPlaceholderText('inquiry.budgetMax'), '8000')
    await user.click(screen.getByRole('button', { name: /compare.sendToArtists/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/quote-requests')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.artist_ids).toEqual(['id-1', 'id-2'])
    expect(body.description).toContain('足夠長')
    expect(body.budget_min).toBe(3000)
    expect(body.budget_max).toBe(8000)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/quote-requests/qr-99')
    })
  })

  it('shows API error message on failed submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'quota exceeded' }),
      }),
    )
    const user = userEvent.setup()
    render(<NewQuoteRequestPage />)

    await user.type(
      screen.getByLabelText(/inquiry.description/),
      '這是一段足夠長的詢價描述內容',
    )
    await user.click(screen.getByRole('button', { name: 'pick-body' }))
    await user.type(screen.getByLabelText(/inquiry.sizeEstimate/), '10cm')
    await user.click(screen.getByRole('button', { name: /compare.sendToArtists/ }))

    await waitFor(() => {
      expect(screen.getByText('quota exceeded')).toBeInTheDocument()
    })
  })
})
