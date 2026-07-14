import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * HAR-666: page.listing-header.test.tsx only exercises the default export;
 * `generateMetadata` was 0% covered.
 */

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

// The page module also imports the data layer + these client components at
// the top level; stub them all so importing '../page' doesn't pull in the
// i18n navigation module graph or hit real Supabase (same set page.listing-header.test.tsx uses).
vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtists: vi.fn(async () => ({ data: [], total: 0 })),
  DEFAULT_PAGE_SIZE: 12,
}))
vi.mock('@/lib/supabase/queries/styles', () => ({ getAllStyles: vi.fn(async () => []) }))
vi.mock('@/lib/auth/helpers', () => ({ getCurrentUser: vi.fn(async () => null) }))
vi.mock('@/lib/supabase/queries/favorites', () => ({
  getFavoritedArtistIds: vi.fn(async () => new Set()),
}))
vi.mock('@/components/artists/ArtistFilters', () => ({
  ArtistFilters: () => null,
}))
vi.mock('@/components/artists/ActiveFilterChips', () => ({
  ActiveFilterChips: () => null,
}))
vi.mock('@/components/artists/ArtistCard', () => ({ ArtistCard: () => null }))
vi.mock('@/components/artists/ArtistListingHeader', () => ({
  ArtistListingHeader: () => null,
}))
vi.mock('@/components/artists/ArtistPagination', () => ({
  ArtistPagination: () => null,
}))

import { generateMetadata } from '../page'

describe('ArtistsPage generateMetadata', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the localized title/description, OG tags, and locale-aware canonical', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })

    expect(metadata.title).toBe('artistsTitle')
    expect(metadata.description).toBe('artistsDescription')
    expect(metadata.openGraph?.title).toBe('artistsTitle')
    expect(metadata.alternates?.canonical).toBe('https://ink-hunt.com/en/artists')
    expect(metadata.alternates?.languages).toMatchObject({
      'zh-TW': 'https://ink-hunt.com/zh-TW/artists',
      en: 'https://ink-hunt.com/en/artists',
    })
  })
})
