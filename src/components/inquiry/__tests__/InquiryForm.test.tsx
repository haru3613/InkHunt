import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Mocks (must be declared before component imports) ---

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  trackSubmitInquiry: vi.fn(),
}))

vi.mock('@/components/inquiry/ReferenceImageUpload', () => ({
  ReferenceImageUpload: () => <div data-testid="ref-upload" />,
}))

vi.mock('@/components/ui/bottom-drawer', () => ({
  BottomDrawer: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange?: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="drawer">
        {/* Test helper: close button that triggers the internal onOpenChange */}
        <button
          data-testid="drawer-close-trigger"
          type="button"
          onClick={() => onOpenChange?.(false)}
        >
          close
        </button>
        {children}
      </div>
    ) : null,
  BottomDrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BottomDrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BottomDrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  BottomDrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (value: string) => void
    value?: string
  }) => (
    <div data-testid="select">
      {/* Render a native select so tests can fireEvent.change on it */}
      <select
        aria-label="body-part-select"
        value={value ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}))

// --- Component imports (after mocks) ---
import { InquiryForm } from '../InquiryForm'
import { useAuth } from '@/hooks/useAuth'
import { trackSubmitInquiry } from '@/lib/analytics'
import { useRouter } from 'next/navigation'

const mockedUseAuth = vi.mocked(useAuth)
const mockedTrackSubmitInquiry = vi.mocked(trackSubmitInquiry)
const mockedUseRouter = vi.mocked(useRouter)

// --- Helpers ---

function makeAuthGuest() {
  mockedUseAuth.mockReturnValue({
    isLoggedIn: false,
    isLoading: false,
    user: null,
    artist: null,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    refetch: vi.fn(),
  })
}

function makeAuthLoggedIn() {
  mockedUseAuth.mockReturnValue({
    isLoggedIn: true,
    isLoading: false,
    user: { lineUserId: 'U123', displayName: 'Test User', avatarUrl: null },
    artist: null,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    refetch: vi.fn(),
  })
}

const defaultProps = {
  artistId: 'artist-uuid-1',
  artistName: '測試刺青師',
  artistSlug: 'test-artist',
  open: true,
  onOpenChange: vi.fn(),
}

// --- Tests ---

describe('InquiryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: guest user
    makeAuthGuest()
    // Default router push spy
    const pushMock = vi.fn()
    mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>)
  })

  describe('visibility', () => {
    it('does not render when open is false', () => {
      makeAuthGuest()
      render(<InquiryForm {...defaultProps} open={false} />)

      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument()
    })

    it('renders the drawer when open is true', () => {
      render(<InquiryForm {...defaultProps} open={true} />)

      expect(screen.getByTestId('drawer')).toBeInTheDocument()
    })
  })

  describe('form fields', () => {
    it('renders description textarea when open', () => {
      render(<InquiryForm {...defaultProps} />)

      expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
    })

    it('renders size estimate input when open', () => {
      render(<InquiryForm {...defaultProps} />)

      // Input labelled with translation key 'sizeEstimate'
      expect(screen.getByLabelText(/sizeEstimate/i)).toBeInTheDocument()
    })

    it('renders the reference image upload slot', () => {
      render(<InquiryForm {...defaultProps} />)

      expect(screen.getByTestId('ref-upload')).toBeInTheDocument()
    })

    it('renders title with artist name via translation key', () => {
      render(<InquiryForm {...defaultProps} artistName="林小華" />)

      // The mock translator produces "title:{"artistName":"林小華"}"
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('林小華')
    })
  })

  describe('auth gate — button label', () => {
    it('shows LINE login button text when user is not logged in', () => {
      makeAuthGuest()
      render(<InquiryForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /LINE 登入後詢價/i })).toBeInTheDocument()
    })

    it('shows submit button text (translation key) when user is logged in', () => {
      makeAuthLoggedIn()
      render(<InquiryForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument()
    })
  })

  describe('auth gate — redirect on submit', () => {
    it('calls loginWithRedirect when unauthenticated user submits the form', async () => {
      const loginWithRedirect = vi.fn()
      mockedUseAuth.mockReturnValue({
        isLoggedIn: false,
        isLoading: false,
        user: null,
        artist: null,
        loginWithRedirect,
        logout: vi.fn(),
        refetch: vi.fn(),
      })

      render(<InquiryForm {...defaultProps} />)

      const form = screen.getByRole('button', { name: /LINE 登入後詢價/i }).closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(loginWithRedirect).toHaveBeenCalledOnce()
      })
    })

    it('does not call fetch when unauthenticated user submits', async () => {
      makeAuthGuest()
      global.fetch = vi.fn()

      render(<InquiryForm {...defaultProps} />)

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled()
      })
    })
  })

  describe('validation', () => {
    it('shows description error when submitting with empty description', async () => {
      makeAuthLoggedIn()
      render(<InquiryForm {...defaultProps} />)

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        // Zod message: '請至少描述 10 個字'
        expect(screen.getByText('請至少描述 10 個字')).toBeInTheDocument()
      })
    })

    it('shows body_part error when submitting without selecting a body part', async () => {
      makeAuthLoggedIn()
      render(<InquiryForm {...defaultProps} />)

      // Fill in description to pass that validation but leave body_part empty
      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, '這是一段超過十個字的刺青描述')

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('請選擇刺青部位')).toBeInTheDocument()
      })
    })

    it('shows size_estimate error when submitting without size', async () => {
      makeAuthLoggedIn()
      render(<InquiryForm {...defaultProps} />)

      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, '這是一段超過十個字的刺青描述')

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('請填寫預計大小')).toBeInTheDocument()
      })
    })

    it('clears a field error when that field is edited', async () => {
      makeAuthLoggedIn()
      render(<InquiryForm {...defaultProps} />)

      // Trigger validation errors
      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('請至少描述 10 個字')).toBeInTheDocument()
      })

      // Type into description — error should disappear
      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, '超過十個字的測試描述文字')

      await waitFor(() => {
        expect(screen.queryByText('請至少描述 10 個字')).not.toBeInTheDocument()
      })
    })
  })

  describe('successful submission', () => {
    beforeEach(() => {
      makeAuthLoggedIn()
    })

    async function fillValidForm() {
      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, '希望刺一個極簡風格的玫瑰花，放在手腕內側')

      const sizeInput = screen.getByLabelText(/sizeEstimate/i)
      await userEvent.type(sizeInput, '5cm x 5cm')

      // Select a body part via the native select rendered by our Select mock
      const bodyPartSelect = screen.getByRole('combobox', { name: 'body-part-select' })
      fireEvent.change(bodyPartSelect, { target: { value: '手腕' } })
    }

    it('POSTs to /api/inquiries with artist_id and form data', async () => {
      const pushMock = vi.fn()
      mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'inquiry-uuid-1' }),
      })

      render(<InquiryForm {...defaultProps} />)
      await fillValidForm()

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/inquiries',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const body = JSON.parse(
          (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        )
        expect(body.artist_id).toBe('artist-uuid-1')
        expect(body.description).toContain('希望刺一個')
        expect(body.size_estimate).toBe('5cm x 5cm')
      })
    })

    it('redirects to /inquiries/:id after successful submission', async () => {
      const pushMock = vi.fn()
      mockedUseRouter.mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'inquiry-uuid-1' }),
      })

      render(<InquiryForm {...defaultProps} />)
      await fillValidForm()

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/inquiries/inquiry-uuid-1')
      })
    })

    it('calls trackSubmitInquiry with artistSlug after successful submission', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'inquiry-uuid-2' }),
      })

      render(<InquiryForm {...defaultProps} artistSlug="test-artist" />)
      await fillValidForm()

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockedTrackSubmitInquiry).toHaveBeenCalledWith(
          'test-artist',
          '手腕', // body_part selected in fillValidForm
          undefined, // budget not filled
        )
      })
    })

    it('calls onOpenChange(false) after successful submission', async () => {
      const onOpenChange = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'inquiry-uuid-3' }),
      })

      render(<InquiryForm {...defaultProps} onOpenChange={onOpenChange} />)
      await fillValidForm()

      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('API error handling', () => {
    beforeEach(() => {
      makeAuthLoggedIn()
    })

    async function fillAndSubmit() {
      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, '希望刺一個極簡風格的玫瑰花，放在手腕內側')
      const sizeInput = screen.getByLabelText(/sizeEstimate/i)
      await userEvent.type(sizeInput, '5cm')
      const bodyPartSelect = screen.getByRole('combobox', { name: 'body-part-select' })
      fireEvent.change(bodyPartSelect, { target: { value: '手腕' } })
      const form = screen.getByTestId('drawer').querySelector('form')!
      fireEvent.submit(form)
    }

    it('shows _form error when the API returns a non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: '刺青師不存在' }),
      })

      render(<InquiryForm {...defaultProps} />)
      await fillAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('刺青師不存在')).toBeInTheDocument()
      })
    })

    it('shows generic error message when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

      render(<InquiryForm {...defaultProps} />)
      await fillAndSubmit()

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })
  })

  describe('drawer close resets form', () => {
    it('resets form state when the drawer is closed then reopened', async () => {
      makeAuthLoggedIn()
      // Use a stateful wrapper so open prop changes propagate correctly
      const onOpenChange = vi.fn()
      const currentOpen = true

      const { rerender } = render(
        <InquiryForm {...defaultProps} open={true} onOpenChange={onOpenChange} />,
      )

      // Type something into description
      const descriptionInput = screen.getByRole('textbox', { name: /description/i })
      await userEvent.type(descriptionInput, 'Some description text input')
      expect((descriptionInput as HTMLTextAreaElement).value).toBe('Some description text input')

      // Click the test close button — this calls handleOpenChange(false), resetting state
      await userEvent.click(screen.getByTestId('drawer-close-trigger'))
      // onOpenChange should have been called with false
      expect(onOpenChange).toHaveBeenCalledWith(false)

      // Simulate the parent re-rendering with open=true (user re-opens the drawer)
      rerender(<InquiryForm {...defaultProps} open={true} onOpenChange={onOpenChange} />)

      const reopenedInput = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement
      // handleOpenChange reset the state, so description should be empty now
      expect(reopenedInput.value).toBe('')
    })
  })
})
