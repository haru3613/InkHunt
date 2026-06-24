import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Style } from '@/types/database'

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
  // Echo the key so chips assert on resolved-label structure deterministically.
  // When interpolation values are passed (searchChipLabel), append them so the
  // search term stays assertable under the key-echo convention.
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${Object.values(values).join(',')}` : key,
}))

import { ActiveFilterChips } from '../ActiveFilterChips'

const STYLES: Style[] = [
  {
    id: 1,
    slug: 'traditional',
    name: 'Traditional',
    icon: null,
    name_en: null,
    description: null,
    subtitle: null,
    group_name: null,
    color_profile: null,
    popularity: 0,
    sort_order: 0,
  },
]

/** The remove (×) control rendered inside the chip whose text contains `label`. */
function removeButtonFor(label: string): HTMLButtonElement {
  const chip = screen.getByText(label, { exact: false }).closest('[data-slot="filter-chip"]')
  if (!chip) throw new Error(`no chip wraps label "${label}"`)
  const btn = chip.querySelector('button')
  if (!btn) throw new Error(`chip for "${label}" has no remove button`)
  return btn as HTMLButtonElement
}

describe('ActiveFilterChips (HAR-454)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key)
  })

  it('renders nothing when no filter is active', () => {
    const { container } = render(<ActiveFilterChips styles={STYLES} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one chip per active filter with resolved labels', () => {
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')
    mockSearchParams.set('budget', 'le6000')
    mockSearchParams.set('service', 'coverup')

    render(<ActiveFilterChips styles={STYLES} />)

    // style slug → name via the styles prop
    expect(screen.getByText('Traditional', { exact: false })).toBeInTheDocument()
    // city raw value is shown directly
    expect(screen.getByText('台北市', { exact: false })).toBeInTheDocument()
    // budget/service resolve via the existing i18n option keys
    expect(screen.getByText('budgetLe6000', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('serviceCoverup', { exact: false })).toBeInTheDocument()

    // exactly four removable chips
    const chips = screen.getAllByTestId('filter-chip')
    expect(chips).toHaveLength(4)
  })

  it('resolves a sort chip via its option label', () => {
    mockSearchParams.set('sort', 'price_low')
    render(<ActiveFilterChips styles={STYLES} />)
    expect(screen.getByText('sortPriceLow', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByTestId('filter-chip')).toHaveLength(1)
  })

  it('removing one chip navigates with only that param dropped (others intact)', () => {
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')
    mockSearchParams.set('budget', 'le6000')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('台北市'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('city=')
    expect(url).toContain('style=traditional')
    expect(url).toContain('budget=le6000')
  })

  it('removing a chip also resets pagination', () => {
    mockSearchParams.set('service', 'coverup')
    mockSearchParams.set('page', '3')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('serviceCoverup'))

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('service=')
    expect(url).not.toContain('page=3')
  })

  it('清除全部 navigates with all five params dropped', () => {
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')
    mockSearchParams.set('sort', 'price_low')
    mockSearchParams.set('budget', 'le6000')
    mockSearchParams.set('service', 'coverup')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(screen.getByText('clearAll'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    for (const key of ['style=', 'city=', 'sort=', 'budget=', 'service=']) {
      expect(url).not.toContain(key)
    }
  })

  it('falls back to the raw style slug when it is not in the styles prop', () => {
    mockSearchParams.set('style', 'unknown-slug')
    render(<ActiveFilterChips styles={STYLES} />)
    expect(screen.getByText('unknown-slug', { exact: false })).toBeInTheDocument()
  })

  // --- HAR-457: active search (q) chip ---

  it('renders a search chip carrying the q term when q is a non-empty string', () => {
    mockSearchParams.set('q', 'bob')
    render(<ActiveFilterChips styles={STYLES} />)

    // The chip's visible label embeds the raw search term.
    expect(screen.getByText('bob', { exact: false })).toBeInTheDocument()
    const chips = screen.getAllByTestId('filter-chip')
    expect(chips).toHaveLength(1)
  })

  it('does not render a search chip when q is absent', () => {
    const { container } = render(<ActiveFilterChips styles={STYLES} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render a search chip when q is present but empty/whitespace', () => {
    mockSearchParams.set('q', '   ')
    const { container } = render(<ActiveFilterChips styles={STYLES} />)
    expect(container.firstChild).toBeNull()
  })

  it('removing the search chip drops q but preserves other params', () => {
    mockSearchParams.set('q', 'bob')
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('bob'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('q=')
    expect(url).toContain('style=traditional')
    expect(url).toContain('city=')
  })

  it('removing the search chip also resets pagination', () => {
    mockSearchParams.set('q', 'bob')
    mockSearchParams.set('page', '3')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('bob'))

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('q=')
    expect(url).not.toContain('page=3')
  })

  it('清除全部 also drops q (bare /artists when q is the only filter)', () => {
    mockSearchParams.set('q', 'bob')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(screen.getByText('clearAll'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).toBe('/artists')
    expect(url).not.toContain('q=')
  })

  it('清除全部 drops q alongside the other five params', () => {
    mockSearchParams.set('q', 'bob')
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')
    mockSearchParams.set('sort', 'price_low')
    mockSearchParams.set('budget', 'le6000')
    mockSearchParams.set('service', 'coverup')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(screen.getByText('clearAll'))

    const url = mockPush.mock.calls[0][0] as string
    for (const key of ['q=', 'style=', 'city=', 'sort=', 'budget=', 'service=']) {
      expect(url).not.toContain(key)
    }
  })

  // --- HAR-477: active minRating (評分) chip ---

  it('renders a rating chip labelled 4★+ when minRating=4 is set', () => {
    mockSearchParams.set('minRating', '4')
    render(<ActiveFilterChips styles={STYLES} />)

    expect(screen.getByText('rating4Plus', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByTestId('filter-chip')).toHaveLength(1)
  })

  it('renders a rating chip labelled 4.5★+ when minRating=4.5 is set', () => {
    mockSearchParams.set('minRating', '4.5')
    render(<ActiveFilterChips styles={STYLES} />)

    expect(screen.getByText('rating45Plus', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByTestId('filter-chip')).toHaveLength(1)
  })

  it('does not render a rating chip for a minRating outside the 4 / 4.5 allowlist', () => {
    mockSearchParams.set('minRating', '3')
    const { container } = render(<ActiveFilterChips styles={STYLES} />)
    expect(container.firstChild).toBeNull()
  })

  it('removing the rating chip drops minRating but preserves other params', () => {
    mockSearchParams.set('minRating', '4')
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('rating4Plus'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('minRating=')
    expect(url).toContain('style=traditional')
    expect(url).toContain('city=')
  })

  it('removing the rating chip also resets pagination', () => {
    mockSearchParams.set('minRating', '4.5')
    mockSearchParams.set('page', '3')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(removeButtonFor('rating45Plus'))

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('minRating=')
    expect(url).not.toContain('page=3')
  })

  it('清除全部 drops minRating alongside the other params', () => {
    mockSearchParams.set('minRating', '4')
    mockSearchParams.set('style', 'traditional')
    mockSearchParams.set('city', '台北市')

    render(<ActiveFilterChips styles={STYLES} />)

    fireEvent.click(screen.getByText('clearAll'))

    const url = mockPush.mock.calls[0][0] as string
    expect(url).not.toContain('minRating=')
    expect(url).not.toContain('style=')
  })
})
