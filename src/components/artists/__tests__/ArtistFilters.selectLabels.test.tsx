import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// --- Mocks (must be declared before the component import) ---

const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { ArtistFilters } from '../ArtistFilters'

// HAR-757: each closed select trigger must render the *label* of the selected
// option, never its raw value. Unlike ArtistFilters.test.tsx (which swaps
// ui/select for a native <select> mock), this file renders the REAL Base UI
// Select — the raw-value leak only exists there, because Base UI's
// <Select.Value> falls back to the raw value unless the Root gets `items`.
describe('ArtistFilters — closed triggers render localized labels (HAR-757)', () => {
  it('shows the default option label for all five selects', () => {
    render(<ArtistFilters styles={[]} />)

    // Default selections: city=all, sort=featured, budget=any, service=all,
    // minRating=all. The mocked t() returns the key, so the visible text must
    // be the label KEY — seeing the raw VALUE means the bug is back.
    expect(screen.getByText('allRegions')).toBeInTheDocument()
    expect(screen.getByText('sortFeatured')).toBeInTheDocument()
    expect(screen.getByText('budgetAny')).toBeInTheDocument()
    expect(screen.getByText('serviceAll')).toBeInTheDocument()
    expect(screen.getByText('ratingAll')).toBeInTheDocument()
  })

  it('never leaks a raw option value as visible trigger text', () => {
    render(<ArtistFilters styles={[]} />)

    for (const raw of ['all', 'featured', 'any']) {
      expect(screen.queryByText(raw)).not.toBeInTheDocument()
    }
  })
})
