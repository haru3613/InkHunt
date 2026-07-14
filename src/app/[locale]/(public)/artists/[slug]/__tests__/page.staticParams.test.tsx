import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * HAR-666: `generateStaticParams` (SSG param list, HAR spec: "SEO 優先")
 * was 0% covered — page.metadata.test.tsx and page.reviews.test.tsx never
 * import it.
 */

const { getArtists } = vi.hoisted(() => ({
  getArtists: vi.fn<() => Promise<{ data: unknown[]; total: number }>>(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtists,
  getArtistBySlug: vi.fn(),
}))
vi.mock('@/lib/supabase/queries/reviews', () => ({ getReviewsByArtistId: vi.fn(async () => []) }))

// The page module also imports these client components at the top level;
// stub them so importing '../page' doesn't pull in the i18n navigation
// module graph (same issue page.metadata.test.tsx works around).
vi.mock('@/components/shared/JsonLd', () => ({ JsonLd: () => null }))
vi.mock('@/components/artists/BackButton', () => ({ BackButton: () => null }))
vi.mock('@/components/artists/ArtistProfile', () => ({ ArtistProfile: () => null }))
vi.mock('@/components/artists/ArtistCompareAction', () => ({ ArtistCompareAction: () => null }))
vi.mock('@/components/artists/ArtistProfileTracker', () => ({ ArtistProfileTracker: () => null }))
vi.mock('@/components/artists/PortfolioSection', () => ({ PortfolioSection: () => null }))
vi.mock('@/components/artists/MobileCTA', () => ({ MobileCTA: () => null }))
vi.mock('@/components/artist/ArtistReviewFormSection', () => ({
  ArtistReviewFormSection: () => null,
}))

import { generateStaticParams } from '../page'

describe('generateStaticParams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns one { slug } param per active artist', async () => {
    getArtists.mockResolvedValue({
      data: [{ slug: 'ink-master' }, { slug: 'rose-tattoo' }],
      total: 2,
    })

    const params = await generateStaticParams()

    expect(params).toEqual([{ slug: 'ink-master' }, { slug: 'rose-tattoo' }])
  })

  it('returns an empty array when there are no artists yet', async () => {
    getArtists.mockResolvedValue({ data: [], total: 0 })

    expect(await generateStaticParams()).toEqual([])
  })
})
