import { formatPriceRange, formatIgUrl } from '@/lib/utils'
import type { ReviewSummary } from '@/lib/reviews'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ink-hunt.com'

/**
 * The slice of {@link ReviewSummary} the artist JSON-LD needs. Accepting a
 * structural subset (rather than the full `ReviewSummary`) lets callers pass
 * either `{ average, count }` or a complete summary object; the optional
 * `distribution` field is tolerated but unused.
 */
type ArtistReviewSummary = Pick<ReviewSummary, 'average' | 'count'> & {
  distribution?: ReviewSummary['distribution']
}

export function generateArtistJsonLd(
  artist: {
    display_name: string
    bio?: string | null
    avatar_url?: string | null
    city: string
    district?: string | null
    slug: string
    price_min?: number | null
    price_max?: number | null
    ig_handle?: string | null
  },
  reviewSummary?: ArtistReviewSummary,
) {
  const igUrl = artist.ig_handle ? formatIgUrl(artist.ig_handle) : null

  // Google forbids `aggregateRating` with zero reviews, so emit it only when a
  // summary with at least one review is supplied. Leaving the value `undefined`
  // otherwise keeps the serialized output byte-identical to the no-summary case,
  // mirroring the `image` / `sameAs` conditional-omission pattern above.
  const aggregateRating =
    reviewSummary && reviewSummary.count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: reviewSummary.average,
          reviewCount: reviewSummary.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'TattooParlor',
    name: artist.display_name,
    description: artist.bio || `${artist.display_name} 的刺青作品集`,
    image: artist.avatar_url || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: artist.city,
      addressRegion: artist.district || undefined,
      addressCountry: 'TW',
    },
    priceRange: formatPriceRange(artist.price_min, artist.price_max) ?? undefined,
    url: `${SITE_URL}/artists/${artist.slug}`,
    sameAs: igUrl ? [igUrl] : undefined,
    aggregateRating,
  }
}

export function generateStyleCollectionJsonLd(style: {
  name: string
  slug: string
  artistCount: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${style.name}刺青推薦 | InkHunt`,
    description: `精選台灣${style.name}風格刺青師，查看作品集和價格。`,
    url: `${SITE_URL}/styles/${style.slug}`,
    numberOfItems: style.artistCount,
  }
}

export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'InkHunt',
    alternateName: '找到你的刺青師',
    url: SITE_URL,
    description: '台灣第一個刺青師媒合平台。按風格篩選、瀏覽作品集、價格透明、一鍵詢價。',
    inLanguage: 'zh-TW',
  }
}
