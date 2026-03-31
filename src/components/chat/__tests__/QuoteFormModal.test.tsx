import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QuoteFormModal } from '../QuoteFormModal'
import type { QuoteTemplate } from '../QuoteFormModal'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

const TEMPLATES: QuoteTemplate[] = [
  { label: '小圖案', price: 3000, note: '含設計費' },
  { label: '大作品', price: 15000 },
]

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  consumerName: '王小明',
  inquiryDescription: '想在手腕刺一個小玫瑰',
  templates: [],
  onSubmit: vi.fn(),
}

describe('QuoteFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onOpenChange = vi.fn()
    defaultProps.onSubmit = vi.fn()
  })

  it('does not render when open is false', () => {
    render(<QuoteFormModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('renders price input and note textarea when open', () => {
    render(<QuoteFormModal {...defaultProps} />)
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('price')).toBeInTheDocument()
    expect(screen.getByLabelText('note')).toBeInTheDocument()
  })

  it('shows inquiry description when provided', () => {
    render(<QuoteFormModal {...defaultProps} />)
    expect(screen.getByText('想在手腕刺一個小玫瑰')).toBeInTheDocument()
  })

  it('does not render inquiry description paragraph when empty', () => {
    render(<QuoteFormModal {...defaultProps} inquiryDescription="" />)
    // The paragraph element is conditionally rendered only when description is truthy
    expect(screen.queryByText('想在手腕刺一個小玫瑰')).not.toBeInTheDocument()
  })

  it('fills price and note from template when template button is clicked', () => {
    render(<QuoteFormModal {...defaultProps} templates={TEMPLATES} />)

    fireEvent.click(screen.getByRole('button', { name: '小圖案' }))

    const priceInput = screen.getByLabelText('price') as HTMLInputElement
    const noteTextarea = screen.getByLabelText('note') as HTMLTextAreaElement
    expect(priceInput.value).toBe('3000')
    expect(noteTextarea.value).toBe('含設計費')
  })

  it('fills price and clears note when template has no note', () => {
    render(<QuoteFormModal {...defaultProps} templates={TEMPLATES} />)

    // First set a note via template with note
    fireEvent.click(screen.getByRole('button', { name: '小圖案' }))
    // Then select template without note
    fireEvent.click(screen.getByRole('button', { name: '大作品' }))

    const noteTextarea = screen.getByLabelText('note') as HTMLTextAreaElement
    expect(noteTextarea.value).toBe('')
  })

  it('shows error when submitting without price', async () => {
    render(<QuoteFormModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))

    await waitFor(() => {
      expect(screen.getByText('priceRequired')).toBeInTheDocument()
    })
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when price is zero', async () => {
    render(<QuoteFormModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))

    await waitFor(() => {
      expect(screen.getByText('priceRequired')).toBeInTheDocument()
    })
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('shows error when price is negative', async () => {
    render(<QuoteFormModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '-100' } })
    fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))

    await waitFor(() => {
      expect(screen.getByText('priceRequired')).toBeInTheDocument()
    })
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('clears price validation error when user types a new value', async () => {
    render(<QuoteFormModal {...defaultProps} />)

    // Trigger validation error
    fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    await waitFor(() => expect(screen.getByText('priceRequired')).toBeInTheDocument())

    // Typing in the price field should clear the error
    fireEvent.change(screen.getByLabelText('price'), { target: { value: '1' } })
    expect(screen.queryByText('priceRequired')).not.toBeInTheDocument()
  })

  it('calls onSubmit with parsed price and trimmed note on valid submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<QuoteFormModal {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '5000' } })
    fireEvent.change(screen.getByLabelText('note'), { target: { value: '  含設計費  ' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ price: 5000, note: '含設計費' })
    })
  })

  it('omits note from payload when note is blank after trimming', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<QuoteFormModal {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '3000' } })
    fireEvent.change(screen.getByLabelText('note'), { target: { value: '   ' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ price: 3000, note: undefined })
    })
  })

  it('closes modal and resets form after successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    render(
      <QuoteFormModal {...defaultProps} onSubmit={onSubmit} onOpenChange={onOpenChange} />,
    )

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '5000' } })
    fireEvent.change(screen.getByLabelText('note'), { target: { value: '備註' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    // Re-render with open=true to verify form was reset
    const { rerender } = render(
      <QuoteFormModal {...defaultProps} onSubmit={onSubmit} onOpenChange={onOpenChange} open={true} />,
    )
    rerender(
      <QuoteFormModal {...defaultProps} onSubmit={onSubmit} onOpenChange={onOpenChange} open={true} />,
    )
    const priceInput = screen.getAllByLabelText('price')[0] as HTMLInputElement
    expect(priceInput.value).toBe('')
  })

  it('shows submitError when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('network error'))
    render(<QuoteFormModal {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '5000' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    })

    await waitFor(() => {
      expect(screen.getByText('submitError')).toBeInTheDocument()
    })
    // Modal should remain open
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled()
  })

  it('does not close modal when submitting (isSubmitting guard blocks handleClose)', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        }),
    )
    const onOpenChange = vi.fn()
    render(
      <QuoteFormModal {...defaultProps} onSubmit={onSubmit} onOpenChange={onOpenChange} />,
    )

    fireEvent.change(screen.getByLabelText('price'), { target: { value: '5000' } })

    // Start submit (will hang until resolveSubmit is called)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'sendQuote' }))
    })

    // While submitting, try to cancel
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'submitting' })).toBeInTheDocument()
    })

    // Cancel button is disabled during submission
    const cancelButton = screen.getByRole('button', { name: 'cancel' })
    expect(cancelButton).toBeDisabled()

    // Clicking cancel while submitting must not call onOpenChange
    fireEvent.click(cancelButton)
    expect(onOpenChange).not.toHaveBeenCalled()

    // Allow submit to complete
    await act(async () => {
      resolveSubmit()
    })

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('renders template buttons when templates are provided', () => {
    render(<QuoteFormModal {...defaultProps} templates={TEMPLATES} />)
    expect(screen.getByRole('button', { name: '小圖案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '大作品' })).toBeInTheDocument()
  })

  it('does not render template section when templates array is empty', () => {
    render(<QuoteFormModal {...defaultProps} templates={[]} />)
    expect(screen.queryByRole('button', { name: '小圖案' })).not.toBeInTheDocument()
  })
})
