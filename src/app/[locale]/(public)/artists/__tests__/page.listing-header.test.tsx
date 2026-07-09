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

const { getArtists, getAllStyles, getCurrentUser, getFavoritedArtistIds } =
  vi.hoisted(() => ({
    getArtists: vi.fn<
      (filters: unknown) => Promise<{ data: unknown[]; total: number }>
    >(),
    getAllStyles: vi.fn<() => Promise<unknown[]>>(),
    getCurrentUser: vi.fn<() => Promise<{ lineUserId: string } | null>>(),
    getFavoritedArtistIds:
      vi.fn<(lineUserId: string, ids: string[]) => Promise<Set<string>>>(),
  }))

vi.mock('@/lib/supabase/queries/artists', () => ({ getArtists }))
vi.mock('@/lib/supabase/queries/styles', () => ({ getAllStyles }))
vi.mock('@/lib/auth/helpers', () => ({ getCurrentUser }))
vi.mock('@/lib/supabase/queries/favorites', () => ({ getFavoritedArtistIds }))

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

// ArtistCard is sync but stub it to a marker so we can count grid items cheaply
// and assert the saved-state (`initialFavorited`) the page threads in (HAR-594).
vi.mock('@/components/artists/ArtistCard', () => ({
  ArtistCard: ({
    artist,
    initialFavorited,
  }: {
    artist: { id: string }
    initialFavorited?: boolean
  }) => (
    <div
      data-testid="artist-card"
      data-artist-id={artist.id}
      data-initial-favorited={String(initialFavorited ?? false)}
    />
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
  opts: { user?: { lineUserId: string } | null; savedIds?: Set<string> } = {},
) {
  getArtists.mockResolvedValue({ data, total })
  getAllStyles.mockResolvedValue([])
  // Default: logged-out — the page skips the favorites lookup, so pre-HAR-594
  // tests keep their byte-identical behaviour.
  getCurrentUser.mockResolvedValue(opts.user ?? null)
  getFavoritedArtistIds.mockResolvedValue(opts.savedIds ?? new Set())
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

describe('ArtistsPage — keyword search wiring (HAR-456)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the parsed ?q= keyword into the getArtists filters', async () => {
    await renderPage({ q: 'bob' }, ARTISTS, 3)
    expect(getArtists).toHaveBeenCalledTimes(1)
    const filters = getArtists.mock.calls[0][0] as { q?: string | null }
    expect(filters.q).toBe('bob')
  })

  it('leaves q null when no ?q= is present (no search predicate)', async () => {
    await renderPage({}, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { q?: string | null }
    expect(filters.q).toBeNull()
  })

  it('signals active filters when a keyword search is present', async () => {
    await renderPage({ q: 'bob' }, ARTISTS, 3)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })
})

describe('ArtistsPage — minRating wiring (HAR-477)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the parsed ?minRating=4 into the getArtists filters', async () => {
    await renderPage({ minRating: '4' }, ARTISTS, 3)
    expect(getArtists).toHaveBeenCalledTimes(1)
    const filters = getArtists.mock.calls[0][0] as { minRating?: number | null }
    expect(filters.minRating).toBe(4)
  })

  it('passes the parsed ?minRating=4.5 into the getArtists filters', async () => {
    await renderPage({ minRating: '4.5' }, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { minRating?: number | null }
    expect(filters.minRating).toBe(4.5)
  })

  it('leaves minRating null when no ?minRating= is present (no predicate)', async () => {
    await renderPage({}, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { minRating?: number | null }
    expect(filters.minRating).toBeNull()
  })

  it('leaves minRating null for a value outside the 4 / 4.5 allowlist', async () => {
    await renderPage({ minRating: '3' }, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { minRating?: number | null }
    expect(filters.minRating).toBeNull()
  })

  it('signals active filters when a minRating threshold is present', async () => {
    await renderPage({ minRating: '4' }, ARTISTS, 3)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })

  it('does NOT signal active filters for a minRating outside the allowlist', async () => {
    await renderPage({ minRating: '3' }, [], 0)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'false')
  })
})

describe('ArtistsPage — new-artist freshness wiring (HAR-585)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes isNew:true into the getArtists filters when ?new=1', async () => {
    await renderPage({ new: '1' }, ARTISTS, 3)
    expect(getArtists).toHaveBeenCalledTimes(1)
    const filters = getArtists.mock.calls[0][0] as { isNew?: boolean }
    expect(filters.isNew).toBe(true)
  })

  it('leaves isNew false when no ?new= is present (no freshness predicate)', async () => {
    await renderPage({}, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { isNew?: boolean }
    expect(filters.isNew).toBe(false)
  })

  it('leaves isNew false for a non-canonical ?new= value', async () => {
    await renderPage({ new: 'true' }, ARTISTS, 3)
    const filters = getArtists.mock.calls[0][0] as { isNew?: boolean }
    expect(filters.isNew).toBe(false)
  })

  it('signals active filters to the header when new=1 is present', async () => {
    await renderPage({ new: '1' }, ARTISTS, 3)
    expect(screen.getByTestId('listing-header')).toHaveAttribute('data-active', 'true')
  })
})

describe('ArtistsPage — reflects saved state on the grid (HAR-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves the session and fills ONLY the logged-in user\'s saved artist heart', async () => {
    await renderPage({}, ARTISTS, 3, {
      user: { lineUserId: 'U-1' },
      savedIds: new Set(['a2']),
    })

    // ONE bounded favorites lookup over the page's artist ids (no N+1).
    expect(getFavoritedArtistIds).toHaveBeenCalledTimes(1)
    expect(getFavoritedArtistIds).toHaveBeenCalledWith('U-1', ['a1', 'a2', 'a3'])

    const cards = screen.getAllByTestId('artist-card')
    const byId = Object.fromEntries(
      cards.map((c) => [c.getAttribute('data-artist-id'), c]),
    )
    expect(byId['a2']).toHaveAttribute('data-initial-favorited', 'true')
    expect(byId['a1']).toHaveAttribute('data-initial-favorited', 'false')
    expect(byId['a3']).toHaveAttribute('data-initial-favorited', 'false')
  })

  it('does NOT query favorites for a logged-out visit (every heart empty)', async () => {
    await renderPage({}, ARTISTS, 3, { user: null })

    expect(getFavoritedArtistIds).not.toHaveBeenCalled()
    for (const card of screen.getAllByTestId('artist-card')) {
      expect(card).toHaveAttribute('data-initial-favorited', 'false')
    }
  })
})
