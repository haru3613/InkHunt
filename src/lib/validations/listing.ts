import { z } from 'zod'
import type { ArtistSort } from '@/lib/supabase/queries/artists'

/**
 * Valid `/artists` listing sort values (HAR-433). Kept in sync with
 * `ArtistSort` in the artists query layer.
 */
export const ARTIST_SORTS = ['featured', 'price_low', 'price_high', 'newest'] as const

/**
 * Sort enum that coerces unknown/absent/garbage input → `featured`. The page
 * reads `sort` straight off `searchParams` (untrusted string), so this never
 * throws — it always resolves to a safe ordering.
 */
export const listingSortSchema = z
  .unknown()
  .transform((value): ArtistSort =>
    typeof value === 'string' && (ARTIST_SORTS as readonly string[]).includes(value)
      ? (value as ArtistSort)
      : 'featured',
  )

export const listingSearchParamsSchema = z.object({
  sort: listingSortSchema,
})

export type ListingSearchParams = { sort: ArtistSort }

/**
 * Parse `/artists` search params into a validated, defaulted shape. Unrelated
 * params (style/city/page) are ignored here — they have their own handling on
 * the page. Unknown/absent `sort` → `featured`.
 */
export function parseListingSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingSearchParams {
  return { sort: listingSortSchema.parse(searchParams.sort) }
}
