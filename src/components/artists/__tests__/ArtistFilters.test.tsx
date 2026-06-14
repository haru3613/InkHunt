import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// --- Mocks (must be declared before the component import) ---

const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock the base-ui Select with native <select>/<option> so the test can
// fireEvent.change on it and assert the onValueChange-driven URL write.
// (Same approach as InquiryForm.test.tsx.)
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    defaultValue,
    value,
  }: {
    children: React.ReactNode
    onValueChange?: (value: string) => void
    defaultValue?: string
    value?: string
  }) => (
    <select
      defaultValue={value ?? defaultValue}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

/** Find the native <select> that owns a given option label (e.g. the sort one). */
function selectOwning(optionText: string): HTMLSelectElement {
  const option = screen.getByText(optionText)
  const select = option.closest('select')
  if (!select) throw new Error(`no <select> owns option "${optionText}"`)
  return select as HTMLSelectElement
}

import { ArtistFilters } from '../ArtistFilters'

describe('ArtistFilters — sort control (HAR-433)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // reset shared search params between tests
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  it('renders the four sort options', () => {
    render(<ArtistFilters styles={[]} />)

    expect(screen.getByText('sortFeatured')).toBeInTheDocument()
    expect(screen.getByText('sortPriceLow')).toBeInTheDocument()
    expect(screen.getByText('sortPriceHigh')).toBeInTheDocument()
    expect(screen.getByText('sortNewest')).toBeInTheDocument()
  })

  it('writes ?sort=price_low to the URL when 價格低→高 is selected', () => {
    render(<ArtistFilters styles={[]} />)

    const sortSelect = selectOwning('sortFeatured')
    fireEvent.change(sortSelect, { target: { value: 'price_low' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=price_low')
  })

  it('writes ?sort=newest and resets page when 最新 is selected', () => {
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    const sortSelect = selectOwning('sortFeatured')
    fireEvent.change(sortSelect, { target: { value: 'newest' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=newest')
    // updateParams always deletes page
    expect(url).not.toContain('page=3')
  })

  it('removes the sort param when featured (default) is selected', () => {
    mockSearchParams.set('sort', 'price_high')
    render(<ArtistFilters styles={[]} />)

    const sortSelect = selectOwning('sortFeatured')
    fireEvent.change(sortSelect, { target: { value: 'featured' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('sort=')
  })
})

describe('ArtistFilters — budget control (HAR-434)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  it('renders all five budget options', () => {
    render(<ArtistFilters styles={[]} />)

    expect(screen.getByText('budgetAny')).toBeInTheDocument()
    expect(screen.getByText('budgetLe3000')).toBeInTheDocument()
    expect(screen.getByText('budgetLe6000')).toBeInTheDocument()
    expect(screen.getByText('budgetLe10000')).toBeInTheDocument()
    expect(screen.getByText('budgetGt10000')).toBeInTheDocument()
  })

  it('writes ?budget=le6000 to the URL when 6000 以下 is selected', () => {
    render(<ArtistFilters styles={[]} />)

    const budgetSelect = selectOwning('budgetAny')
    fireEvent.change(budgetSelect, { target: { value: 'le6000' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('budget=le6000')
  })

  it('writes ?budget=gt10000 and resets page when 10000 以上 is selected', () => {
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    const budgetSelect = selectOwning('budgetAny')
    fireEvent.change(budgetSelect, { target: { value: 'gt10000' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('budget=gt10000')
    expect(url).not.toContain('page=3')
  })

  it('removes the budget param when 不限 (any/default) is selected', () => {
    mockSearchParams.set('budget', 'le3000')
    render(<ArtistFilters styles={[]} />)

    const budgetSelect = selectOwning('budgetAny')
    fireEvent.change(budgetSelect, { target: { value: 'any' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('budget=')
  })
})
