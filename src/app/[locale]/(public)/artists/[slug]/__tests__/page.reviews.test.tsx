import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the public artist page.
 *
 * The page is an async server component, so we mock its data layer and its
 * heavy client/server children, then `await` the default export to get the
 * rendered React tree and assert that the page WIRES the real
 * `<ArtistReviewsSection>` — fed by `getReviewsByArtistId` + `computeReviewSummary`.
 *
 * This is the vertical-slice proof the data-layer test (`reviews.test.ts`)
 * cannot give: it references the changed `page.tsx` and asserts the section is
 * actually mounted with the fetched reviews + computed summary.
 */

const ARTIST = {
  id: 'artist-1',
  slug: 'test-artist',
  display_name: 'Test Artist',
  bio: null,
  avatar_url: null,
  ig_handle: null,
  city: '台北市',
  district: null,
  styles: [],
  portfolio_items: [],
  price_min: null,
  price_max: null,
}

const REVIEWS = [
  { rating: 5, comment: '非常滿意', author_line_user_id: 'U_b', created_at: '2026-06-01T12:00:00.000Z' },
  { rating: 3, comment: '普通', author_line_user_id: 'U_a', created_at: '2026-01-01T08:00:00.000Z' },
]

const { getArtistBySlug, getReviewsByArtistId, generateArtistJsonLd } =
  vi.hoisted(() => ({
    getArtistBySlug: vi.fn<(slug: string) => Promise<unknown>>(),
    getReviewsByArtistId: vi.fn<(artistId: string) => Promise<unknown[]>>(),
    generateArtistJsonLd: vi.fn<
      (artist: unknown, summary?: { count: number; average: number }) => unknown
    >(() => ({ '@type': 'Person' })),
  }))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtistBySlug,
  getArtists: vi.fn(async () => ({ data: [], total: 0 })),
}))

vi.mock('@/lib/supabase/queries/reviews', () => ({
  getReviewsByArtistId,
}))

vi.mock('@/lib/seo', () => ({
  generateArtistJsonLd,
}))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

// Stub the heavy / client-only children so only the real ArtistReviewsSection
// (the unit under test for this slice) renders through.
vi.mock('@/components/shared/JsonLd', () => ({ JsonLd: () => null }))
vi.mock('@/components/artists/BackButton', () => ({ BackButton: () => null }))
vi.mock('@/components/artists/ArtistProfile', () => ({ ArtistProfile: () => null }))
vi.mock('@/components/artists/ArtistCompareAction', () => ({ ArtistCompareAction: () => null }))
vi.mock('@/components/artists/ArtistProfileTracker', () => ({ ArtistProfileTracker: () => null }))
vi.mock('@/components/artists/PortfolioSection', () => ({
  PortfolioSection: () => <div data-testid="portfolio-section" />,
}))
vi.mock('@/components/artists/MobileCTA', () => ({ MobileCTA: () => null }))

// The write-path wrapper is a client component (useAuth/useRouter) — stub it to
// a marker that echoes its wiring props so the page test stays a server render.
vi.mock('@/components/artist/ArtistReviewFormSection', () => ({
  ArtistReviewFormSection: ({ artistId, artistSlug }: { artistId: string; artistSlug: string }) => (
    <div data-testid="review-form-section" data-artist-id={artistId} data-artist-slug={artistSlug} />
  ),
}))

import ArtistProfilePage from '../page'

async function renderPage() {
  const ui = await ArtistProfilePage({
    params: Promise.resolve({ locale: 'zh-TW', slug: 'test-artist' }),
  })
  return render(ui)
}

describe('ArtistProfilePage — reviews wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getArtistBySlug.mockResolvedValue(ARTIST)
    getReviewsByArtistId.mockResolvedValue(REVIEWS)
    generateArtistJsonLd.mockReturnValue({ '@type': 'Person' })
  })

  it('fetches reviews for the loaded artist by id', async () => {
    await renderPage()
    expect(getReviewsByArtistId).toHaveBeenCalledWith('artist-1')
  })

  it('mounts <ArtistReviewsSection> fed by the fetched reviews', async () => {
    await renderPage()
    const section = screen.getByTestId('artist-reviews-section')
    expect(section).toBeInTheDocument()
    // the fetched review comments are rendered through the section -> list -> cards
    expect(within(section).getByText('非常滿意')).toBeInTheDocument()
    expect(within(section).getByText('普通')).toBeInTheDocument()
    expect(within(section).getAllByTestId('review-card')).toHaveLength(2)
  })

  it('mounts the write-path <ArtistReviewFormSection> wired to the artist id + slug', async () => {
    await renderPage()
    const formSection = screen.getByTestId('review-form-section')
    expect(formSection).toBeInTheDocument()
    // The wrapper receives the loaded artist's id (for the schema payload) and
    // slug (the POST target) — never a client-supplied value.
    expect(formSection).toHaveAttribute('data-artist-id', 'artist-1')
    expect(formSection).toHaveAttribute('data-artist-slug', 'test-artist')
  })

  it('feeds computeReviewSummary into the section (average + count from real data)', async () => {
    await renderPage()
    const summary = screen.getByTestId('review-summary')
    // average of [5, 3] -> 4, count 2
    expect(within(summary).getByText(/2 則評價/)).toBeInTheDocument()
  })

  it('passes the computed summary to generateArtistJsonLd so aggregateRating can emit', async () => {
    await renderPage()
    expect(generateArtistJsonLd).toHaveBeenCalledTimes(1)
    const summaryArg = generateArtistJsonLd.mock.calls[0]?.[1]
    expect(summaryArg).toMatchObject({ count: 2, average: 4 })
  })

  it('degrades to the empty reviews state without crashing when the query fails', async () => {
    getReviewsByArtistId.mockRejectedValueOnce(new Error('db down'))

    await renderPage()

    // page still renders the section, in its empty state, instead of 500-ing
    expect(screen.getByTestId('artist-reviews-section')).toBeInTheDocument()
    expect(screen.getByTestId('review-list-empty')).toBeInTheDocument()
  })
})
