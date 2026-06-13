import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the artists-listing card (HAR-417).
 *
 * `ArtistCard` is an async server component, so we mock its heavy/client-only
 * children + `next-intl/server`, then `await` the component to get the rendered
 * tree and assert it surfaces the review summary (StarRating + average + count)
 * on the listing surface. This is the consuming test the wired QA gate needs —
 * a data-layer test alone (artists.test.ts) does not exercise ArtistCard.tsx.
 */

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, never>)} />
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

// Compare button is a client component pulling in store state — stub it out.
vi.mock('../ArtistCompareAction', () => ({
  ArtistCompareAction: () => null,
}))

// PriceRange is itself an async server component; an unresolved async child
// renders to nothing under RTL's sync render, swallowing the whole card. Stub
// it so the real StarRating-bearing summary renders through.
vi.mock('../PriceRange', () => ({
  PriceRange: () => null,
}))

import { ArtistCard } from '../ArtistCard'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'

const BASE: ArtistWithDetails = {
  id: 'a1',
  slug: 'test-artist',
  display_name: 'Test Artist',
  bio: null,
  avatar_url: null,
  ig_handle: null,
  city: '台北市',
  district: null,
  address: null,
  lat: null,
  lng: null,
  price_min: 3000,
  price_max: 10000,
  pricing_note: null,
  deposit_amount: null,
  booking_notice: null,
  status: 'active',
  is_claimed: true,
  offers_coverup: false,
  offers_custom_design: false,
  has_flash_designs: false,
  featured: false,
  quote_templates: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  styles: [],
  portfolio_items: [],
}

function withSummary(
  summary: { average: number; count: number } | undefined,
): ArtistWithDetails {
  return { ...BASE, reviewSummary: summary }
}

async function renderCard(
  artist: ArtistWithDetails,
  variant: 'default' | 'compact' = 'default',
) {
  const ui = await ArtistCard({ artist, variant })
  return render(ui)
}

describe('ArtistCard — review summary (HAR-417)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the StarRating + average (1 decimal) + (count) when a summary is present (default variant)', async () => {
    await renderCard(withSummary({ average: 4.6, count: 12 }))

    // numeric average to 1 decimal
    expect(screen.getByText('4.6')).toBeInTheDocument()
    // review count
    expect(screen.getByText(/\(12\)/)).toBeInTheDocument()
    // read-only StarRating exposes the rating via aria-label (4.6 -> 5 stars)
    expect(
      screen.getByLabelText('評分 5 分（滿分 5 分）'),
    ).toBeInTheDocument()
  })

  it('renders the summary in the compact variant too', async () => {
    await renderCard(withSummary({ average: 4.0, count: 3 }), 'compact')

    expect(screen.getByText('4.0')).toBeInTheDocument()
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument()
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
  })

  it('shows NO rating when count === 0 (clean card for unreviewed artists)', async () => {
    await renderCard(withSummary({ average: 0, count: 0 }))

    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /評分/ })).not.toBeInTheDocument()
  })

  it('shows NO rating when the summary is omitted entirely', async () => {
    await renderCard(withSummary(undefined))

    expect(screen.queryByRole('img', { name: /評分/ })).not.toBeInTheDocument()
  })
})
