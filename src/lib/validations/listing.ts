import { z } from 'zod'
import type { ArtistSort, ArtistBudget } from '@/lib/supabase/queries/artists'

/**
 * Valid `/artists` listing sort values (HAR-433). Kept in sync with
 * `ArtistSort` in the artists query layer.
 */
export const ARTIST_SORTS = ['featured', 'price_low', 'price_high', 'newest'] as const

/**
 * Valid `/artists` budget bucket values (HAR-434). Kept in sync with
 * `ArtistBudget` in the artists query layer.
 */
export const ARTIST_BUDGETS = ['any', 'le3000', 'le6000', 'le10000', 'gt10000'] as const

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

/**
 * Budget enum that coerces unknown/absent/garbage input → `any` (no price
 * predicate). Same untrusted-string contract as the sort schema (HAR-434).
 */
export const listingBudgetSchema = z
  .unknown()
  .transform((value): ArtistBudget =>
    typeof value === 'string' && (ARTIST_BUDGETS as readonly string[]).includes(value)
      ? (value as ArtistBudget)
      : 'any',
  )

export const listingSearchParamsSchema = z.object({
  sort: listingSortSchema,
  budget: listingBudgetSchema,
})

export type ListingSearchParams = { sort: ArtistSort; budget: ArtistBudget }

/**
 * Parse `/artists` search params into a validated, defaulted shape. Unrelated
 * params (style/city/page) are ignored here — they have their own handling on
 * the page. Unknown/absent `sort` → `featured`, `budget` → `any`.
 */
export function parseListingSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingSearchParams {
  return {
    sort: listingSortSchema.parse(searchParams.sort),
    budget: listingBudgetSchema.parse(searchParams.budget),
  }
}
