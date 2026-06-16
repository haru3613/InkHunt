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
  useTranslations: () => (key: string) => key,
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
})
