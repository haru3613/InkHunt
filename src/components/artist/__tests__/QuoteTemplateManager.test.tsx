import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QuoteTemplateManager } from '../QuoteTemplateManager'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// lucide-react icons are rendered as SVG; mock to keep snapshots stable
vi.mock('lucide-react', () => ({
  Plus: () => <svg data-testid="icon-plus" />,
  Trash2: () => <svg data-testid="icon-trash2" />,
}))

const SAMPLE_TEMPLATES: QuoteTemplate[] = [
  { label: '小圖案', price: 3000, note: '含設計費' },
  { label: '大作品', price: 15000, note: '' },
]

describe('QuoteTemplateManager', () => {
  let onSave: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined)
  })

  it('renders empty state when no templates', () => {
    render(<QuoteTemplateManager templates={[]} onSave={onSave} />)
    expect(screen.getByText('noTemplates')).toBeInTheDocument()
  })

  it('does not render noTemplates text when templates exist', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)
    expect(screen.queryByText('noTemplates')).not.toBeInTheDocument()
  })

  it('renders existing templates with their labels and prices', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案') as HTMLInputElement[]
    expect(labelInputs[0].value).toBe('小圖案')
    expect(labelInputs[1].value).toBe('大作品')

    // Price inputs show empty string when value is 0; non-zero values are rendered as-is
    const priceInputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    expect(priceInputs[0].value).toBe('3000')
    expect(priceInputs[1].value).toBe('15000')
  })

  it('renders existing template notes', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const noteTextareas = screen.getAllByPlaceholderText(
      '預約須知、建議尺寸等...',
    ) as HTMLTextAreaElement[]
    expect(noteTextareas[0].value).toBe('含設計費')
    expect(noteTextareas[1].value).toBe('')
  })

  it('add button adds a new empty template row', () => {
    render(<QuoteTemplateManager templates={[]} onSave={onSave} />)

    fireEvent.click(screen.getByText('addTemplate', { exact: false }))

    // After adding, noTemplates text should disappear
    expect(screen.queryByText('noTemplates')).not.toBeInTheDocument()
    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案') as HTMLInputElement[]
    expect(labelInputs).toHaveLength(1)
    expect(labelInputs[0].value).toBe('')
  })

  it('add button is disabled when at max (5) templates', () => {
    const fiveTemplates: QuoteTemplate[] = Array.from({ length: 5 }, (_, i) => ({
      label: `模板 ${i + 1}`,
      price: 1000 * (i + 1),
    }))
    render(<QuoteTemplateManager templates={fiveTemplates} onSave={onSave} />)

    const addButton = screen.getByRole('button', { name: /addTemplate/ })
    expect(addButton).toBeDisabled()
  })

  it('add button is enabled when below max templates', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const addButton = screen.getByRole('button', { name: /addTemplate/ })
    expect(addButton).not.toBeDisabled()
  })

  it('prevents adding beyond max (5) templates via repeated clicks', () => {
    render(<QuoteTemplateManager templates={[]} onSave={onSave} />)

    const addButton = screen.getByRole('button', { name: /addTemplate/ })

    // Click 5 times
    for (let i = 0; i < 5; i++) {
      fireEvent.click(addButton)
    }

    expect(addButton).toBeDisabled()
    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案')
    expect(labelInputs).toHaveLength(5)

    // 6th click is blocked
    fireEvent.click(addButton)
    expect(screen.getAllByPlaceholderText('例如：小圖案')).toHaveLength(5)
  })

  it('delete button removes the template', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const deleteButtons = screen.getAllByRole('button', { name: '刪除模板' })
    expect(deleteButtons).toHaveLength(2)

    fireEvent.click(deleteButtons[0])

    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案') as HTMLInputElement[]
    expect(labelInputs).toHaveLength(1)
    expect(labelInputs[0].value).toBe('大作品')
  })

  it('deleting last template shows empty state', () => {
    render(<QuoteTemplateManager templates={[SAMPLE_TEMPLATES[0]]} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: '刪除模板' }))

    expect(screen.getByText('noTemplates')).toBeInTheDocument()
  })

  it('editing label updates the template label in state', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案') as HTMLInputElement[]
    fireEvent.change(labelInputs[0], { target: { value: '新標籤' } })

    expect(labelInputs[0].value).toBe('新標籤')
  })

  it('editing price updates the template price in state', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const priceInputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    fireEvent.change(priceInputs[0], { target: { value: '8888' } })

    expect(priceInputs[0].value).toBe('8888')
  })

  it('editing note updates the template note in state', () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const noteTextareas = screen.getAllByPlaceholderText(
      '預約須知、建議尺寸等...',
    ) as HTMLTextAreaElement[]
    fireEvent.change(noteTextareas[0], { target: { value: '全新備註' } })

    expect(noteTextareas[0].value).toBe('全新備註')
  })

  it('save button calls onSave with current templates', async () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(SAMPLE_TEMPLATES)
    })
  })

  it('save button passes edited templates to onSave', async () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案')
    fireEvent.change(labelInputs[0], { target: { value: '修改後標籤' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '修改後標籤' }),
        ]),
      )
    })
  })

  it('shows success message (saved key) after successful save', async () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'saved' })).toBeInTheDocument()
    })
  })

  it('shows saveError when onSave rejects', async () => {
    onSave = vi.fn().mockRejectedValue(new Error('server error'))
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })

    await waitFor(() => {
      expect(screen.getByText('saveError')).toBeInTheDocument()
    })
    // Save button should return to its normal label (not 'saved')
    expect(screen.queryByRole('button', { name: 'saved' })).not.toBeInTheDocument()
  })

  it('save button shows saving label while request is in flight', async () => {
    let resolveSave!: () => void
    onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'saving' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'saving' })).toBeDisabled()

    await act(async () => {
      resolveSave()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'saved' })).toBeInTheDocument()
    })
  })

  it('editing after save clears the success message', async () => {
    render(<QuoteTemplateManager templates={SAMPLE_TEMPLATES} onSave={onSave} />)

    // Save first
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'saveTemplates' }))
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'saved' })).toBeInTheDocument()
    })

    // Now edit a label
    const labelInputs = screen.getAllByPlaceholderText('例如：小圖案')
    fireEvent.change(labelInputs[0], { target: { value: '修改中' } })

    // saved label should revert to saveTemplates
    expect(screen.queryByRole('button', { name: 'saved' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'saveTemplates' })).toBeInTheDocument()
  })
})
