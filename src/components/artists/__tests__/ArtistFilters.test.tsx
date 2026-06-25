import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// Mock the base-ui Input with a plain native <input> so the test can read
// its placeholder/value and fireEvent.change on it. (Same approach as the
// Select mock above.)
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
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

  it('renders all five sort options', () => {
    render(<ArtistFilters styles={[]} />)

    expect(screen.getByText('sortFeatured')).toBeInTheDocument()
    expect(screen.getByText('sortPriceLow')).toBeInTheDocument()
    expect(screen.getByText('sortPriceHigh')).toBeInTheDocument()
    expect(screen.getByText('sortNewest')).toBeInTheDocument()
    expect(screen.getByText('sortRating')).toBeInTheDocument()
  })

  it('writes ?sort=rating to the URL when 評分最高 is selected (HAR-476)', () => {
    render(<ArtistFilters styles={[]} />)

    const sortSelect = selectOwning('sortFeatured')
    fireEvent.change(sortSelect, { target: { value: 'rating' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=rating')
  })

  it('writes ?sort=rating and resets page when 評分最高 is selected (HAR-476)', () => {
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    const sortSelect = selectOwning('sortFeatured')
    fireEvent.change(sortSelect, { target: { value: 'rating' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('sort=rating')
    expect(url).not.toContain('page=3')
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

describe('ArtistFilters — service control (HAR-446)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  it('renders the clear option and the two service options', () => {
    render(<ArtistFilters styles={[]} />)

    expect(screen.getByText('serviceAll')).toBeInTheDocument()
    expect(screen.getByText('serviceCoverup')).toBeInTheDocument()
    expect(screen.getByText('serviceFlash')).toBeInTheDocument()
  })

  it('writes ?service=coverup to the URL when 遮蓋 is selected', () => {
    render(<ArtistFilters styles={[]} />)

    const serviceSelect = selectOwning('serviceAll')
    fireEvent.change(serviceSelect, { target: { value: 'coverup' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('service=coverup')
  })

  it('writes ?service=flash and resets page when Flash 圖 is selected', () => {
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    const serviceSelect = selectOwning('serviceAll')
    fireEvent.change(serviceSelect, { target: { value: 'flash' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('service=flash')
    expect(url).not.toContain('page=3')
  })

  it('drops the service param when the clear (全部) option is selected', () => {
    mockSearchParams.set('service', 'coverup')
    render(<ArtistFilters styles={[]} />)

    const serviceSelect = selectOwning('serviceAll')
    fireEvent.change(serviceSelect, { target: { value: 'all' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('service=')
  })
})

describe('ArtistFilters — keyword search box (HAR-456)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  afterEach(() => {
    // Each fake-timer test opts in; make sure we always restore real timers so
    // an unrelated test that follows isn't left with frozen time.
    vi.useRealTimers()
  })

  /** The search <input>, located by its (mocked-to-key) placeholder. */
  function searchBox(): HTMLInputElement {
    return screen.getByPlaceholderText('searchPlaceholder') as HTMLInputElement
  }

  it('renders a search box with the searchPlaceholder placeholder', () => {
    render(<ArtistFilters styles={[]} />)
    expect(searchBox()).toBeInTheDocument()
  })

  it('seeds its initial value from searchParams q', () => {
    mockSearchParams.set('q', 'ink')
    render(<ArtistFilters styles={[]} />)
    expect(searchBox().value).toBe('ink')
  })

  it('does NOT push on the initial mount (seeded value is not a user edit)', () => {
    vi.useFakeTimers()
    mockSearchParams.set('q', 'ink')
    render(<ArtistFilters styles={[]} />)

    vi.advanceTimersByTime(1000)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('debounces: no push before the timer fires, one push after (~300ms)', () => {
    vi.useFakeTimers()
    render(<ArtistFilters styles={[]} />)

    fireEvent.change(searchBox(), { target: { value: 'bob' } })
    // before the debounce window elapses, nothing is pushed
    expect(mockPush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('q=bob')
  })

  it('coalesces rapid keystrokes into a single push of the final value', () => {
    vi.useFakeTimers()
    render(<ArtistFilters styles={[]} />)

    const box = searchBox()
    fireEvent.change(box, { target: { value: 'b' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(box, { target: { value: 'bo' } })
    vi.advanceTimersByTime(100)
    fireEvent.change(box, { target: { value: 'bob' } })
    vi.advanceTimersByTime(300)

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('q=bob')
  })

  it('resets page when a search is typed', () => {
    vi.useFakeTimers()
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    fireEvent.change(searchBox(), { target: { value: 'bob' } })
    vi.advanceTimersByTime(300)

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('q=bob')
    expect(url).not.toContain('page=3')
  })

  it('clears the q param when the box is emptied', () => {
    vi.useFakeTimers()
    mockSearchParams.set('q', 'bob')
    render(<ArtistFilters styles={[]} />)

    fireEvent.change(searchBox(), { target: { value: '' } })
    vi.advanceTimersByTime(300)

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('q=')
  })

  it('treats a whitespace-only query as empty (clears q)', () => {
    vi.useFakeTimers()
    mockSearchParams.set('q', 'bob')
    render(<ArtistFilters styles={[]} />)

    fireEvent.change(searchBox(), { target: { value: '   ' } })
    vi.advanceTimersByTime(300)

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('q=')
  })
})

describe('ArtistFilters — minimum-rating control (HAR-477)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  it('renders the clear option and the two rating-threshold options', () => {
    render(<ArtistFilters styles={[]} />)

    expect(screen.getByText('ratingAll')).toBeInTheDocument()
    expect(screen.getByText('rating4Plus')).toBeInTheDocument()
    expect(screen.getByText('rating45Plus')).toBeInTheDocument()
  })

  it('writes ?minRating=4 to the URL when 4★+ is selected', () => {
    render(<ArtistFilters styles={[]} />)

    const ratingSelect = selectOwning('ratingAll')
    fireEvent.change(ratingSelect, { target: { value: '4' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('minRating=4')
  })

  it('writes ?minRating=4.5 to the URL when 4.5★+ is selected', () => {
    render(<ArtistFilters styles={[]} />)

    const ratingSelect = selectOwning('ratingAll')
    fireEvent.change(ratingSelect, { target: { value: '4.5' } })

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    // URLSearchParams encodes the dot literally, so assert on the raw 4.5 value.
    expect(url).toContain('minRating=4.5')
  })

  it('writes ?minRating=4 and resets page when 4★+ is selected', () => {
    mockSearchParams.set('page', '3')
    render(<ArtistFilters styles={[]} />)

    const ratingSelect = selectOwning('ratingAll')
    fireEvent.change(ratingSelect, { target: { value: '4' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).toContain('minRating=4')
    expect(url).not.toContain('page=3')
  })

  it('drops the minRating param when the clear (全部) option is selected', () => {
    mockSearchParams.set('minRating', '4')
    render(<ArtistFilters styles={[]} />)

    const ratingSelect = selectOwning('ratingAll')
    fireEvent.change(ratingSelect, { target: { value: 'all' } })

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('minRating=')
  })
})
