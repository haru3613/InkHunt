import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * HAR-666: `generateMetadata` and the not-found branch of the default export
 * were the two chunks of `page.tsx` with 0% coverage (page.reviews.test.tsx
 * only exercises the happy-path render). This file covers both, plus the
 * SEO description assembly (styles/location/price -> the joined description
 * string) that generateMetadata builds from the loaded artist.
 */

const { getArtistBySlug } = vi.hoisted(() => ({
  getArtistBySlug: vi.fn<(slug: string) => Promise<unknown>>(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtistBySlug,
  getArtists: vi.fn(async () => ({ data: [], total: 0 })),
}))

vi.mock('@/lib/supabase/queries/reviews', () => ({
  getReviewsByArtistId: vi.fn(async () => []),
}))

const notFoundSpy = vi.hoisted(() => vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
}))
vi.mock('next/navigation', () => ({ notFound: notFoundSpy }))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${JSON.stringify(values)}` : key),
}))

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

import ArtistProfilePage, { generateMetadata } from '../page'

const FULL_ARTIST = {
  id: 'artist-1',
  slug: 'ink-master',
  display_name: 'Ink Master',
  bio: 'Blackwork specialist',
  avatar_url: 'https://example.com/avatar.jpg',
  ig_handle: '@inkmaster',
  city: '台北市',
  district: '大安區',
  styles: [{ id: 1, name: 'Blackwork' }, { id: 2, name: 'Fine Line' }],
  portfolio_items: [],
  price_min: 3000,
  price_max: 8000,
}

describe('ArtistProfilePage — not-found branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls notFound() and never renders when the slug does not resolve to an artist', async () => {
    getArtistBySlug.mockResolvedValue(null)

    await expect(
      ArtistProfilePage({ params: Promise.resolve({ locale: 'zh-TW', slug: 'ghost' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFoundSpy).toHaveBeenCalledTimes(1)
  })
})

describe('generateMetadata', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the not-found title when the artist does not exist', async () => {
    getArtistBySlug.mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'zh-TW', slug: 'ghost' }),
    })

    expect(metadata.title).toBe('artistNotFound')
  })

  it('builds the description from styles + location + price and sets OG/twitter/canonical', async () => {
    getArtistBySlug.mockResolvedValue(FULL_ARTIST)

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'zh-TW', slug: 'ink-master' }),
    })

    expect(metadata.description).toContain('風格：Blackwork、Fine Line')
    expect(metadata.description).toContain('地點：台北市 大安區')
    expect(metadata.description).toContain('價格：')
    expect(metadata.alternates?.canonical).toBe('https://ink-hunt.com/zh-TW/artists/ink-master')
    expect(metadata.openGraph?.images).toEqual([{ url: FULL_ARTIST.avatar_url }])
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('falls back to the no-details description when styles/location/price are all empty', async () => {
    getArtistBySlug.mockResolvedValue({
      ...FULL_ARTIST,
      styles: [],
      city: null,
      district: null,
      price_min: null,
      price_max: null,
      avatar_url: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'zh-TW', slug: 'ink-master' }),
    })

    expect(metadata.description).toBe('Ink Master 的刺青作品集。在 InkHunt 瀏覽作品、一鍵詢價。')
    expect(metadata.openGraph?.images).toBeUndefined()
  })
})
