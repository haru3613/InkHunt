import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the /artists listing page (HAR-435).
 *
 * The page is an async server component, so we mock its data layer + heavy
 * children, then `await` the default export and assert the page WIRES the real
 * <ArtistListingHeader> with the count + active-filter signal, and only mounts
 * the grid when there are results. <ArtistListingHeader> is stubbed to a marker
 * that echoes its props so this test proves the page->header wiring; the header's
 * own rendering is covered by ArtistListingHeader.test.tsx.
 */

const { getArtists, getAllStyles } = vi.hoisted(() => ({
  getArtists: vi.fn<
    (filters: unknown) => Promise<{ data: unknown[]; total: number }>
  >(),
  getAllStyles: vi.fn<() => Promise<unknown[]>>(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({ getArtists }))
vi.mock('@/lib/supabase/queries/styles', () => ({ getAllStyles }))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

// Heavy client child -> inert.
vi.mock('@/components/artists/ArtistFilters', () => ({
  ArtistFilters: () => <div data-testid="artist-filters" />,
}))

// Client child that pulls in next-intl navigation -> inert. Its own behaviour is
// covered by ActiveFilterChips.test.tsx; stubbing it keeps this page-wiring slice
// from loading the i18n navigation module graph.
vi.mock('@/components/artists/ActiveFilterChips', () => ({
  ActiveFilterChips: () => <div data-testid="active-filter-chips" />,
}))

// ArtistCard is sync but stub it to a marker so we can count grid items cheaply.
vi.mock('@/components/artists/ArtistCard', () => ({
  ArtistCard: ({ artist }: { artist: { id: string } }) => (
    <div data-testid="artist-card" data-artist-id={artist.id} />
  ),
}))

// Stub the header to echo its wiring props — the unit-under-test for this slice
// is the PAGE wiring, not the header's internal rendering.
vi.mock('@/components/artists/ArtistListingHeader', () => ({
  ArtistListingHeader: ({
    total,
    hasActiveFilters,
  }: {
    total: number
    hasActiveFilters: boolean
  }) => (
    <div
      data-testid="listing-header"
      data-total={total}
      data-active={String(hasActiveFilters)}
    />
  ),
}))

import ArtistsPage from '../page'

const ARTISTS = [
  { id: 'a1', slug: 's1' },
  { id: 'a2', slug: 's2' },
  { id: 'a3', slug: 's3' },
]

async function renderPage(
  searchParams: Record<string, string> = {},
  data: unknown[] = ARTISTS,
  total = 12,
) {
  getArtists.mockResolvedValue({ data, total })
  getAllStyles.mockResolvedValue([])
  const ui = await ArtistsPage({
    params: Promise.resolve({ locale: 'zh-TW' }),
    searchParams: Promise.resolve(searchParams),
  })
  return render(ui)
}

describe('ArtistsPage — listing header wiring (HAR-435)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts <ArtistListingHeader> fed by getArtists total', async () => {
    await renderPage({}, ARTISTS, 12)
    const header = screen.getByTestId('listing-header')
    expect(header).toHaveAttribute('data-total', '12')
  })

  it('renders the result grid (one card per artist) when total > 0', async () => {
    await renderPage({}, ARTISTS, 12)
    expect(screen.getAllByTestId('artist-card')).toHaveLength(3)
  })

  it('signals no active filters and renders NO grid when total = 0', async () => {
    await renderPage({}, [], 0)
    const header = screen.getByTestId('listing-header')
    expect(header).toHaveAttribute('data-total', '0')
    expect(header).toHaveAttribute('data-active', 'false')
    expect(screen.queryByTestId('artist-card')).not.toBeInTheDocument()
  })

  it('signals active filters to the header when a style is selected', async () => {
    await renderPage({ style: 'traditional' }, [], 0)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })

  it('signals active filters when sort is not the featured default', async () => {
    await renderPage({ sort: 'newest' }, ARTISTS, 3)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })

  it('signals active filters when budget is not the any default', async () => {
    await renderPage({ budget: 'le3000' }, ARTISTS, 3)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })
})
