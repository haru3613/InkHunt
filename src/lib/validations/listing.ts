import { z } from 'zod'
import type { ArtistSort, ArtistBudget, ArtistService } from '@/lib/supabase/queries/artists'

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
 * Valid `/artists` service-offering filter values (HAR-446). Kept in sync with
 * `ArtistService` in the artists query layer. Unlike sort/budget there is no
 * "all" sentinel — absence of the param means no service predicate, so the
 * parsed value is `'coverup' | 'flash' | null`.
 */
export const ARTIST_SERVICES = ['coverup', 'flash'] as const

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

/**
 * Parse a raw `service` search param into a valid `ArtistService` or `null`
 * (HAR-446). Mirrors the sort/budget coercion contract — the page reads the
 * value straight off `searchParams` (untrusted string) so this never throws —
 * but absent/invalid resolves to `null` (no predicate) rather than a default
 * value, because "no service filter" is the bare-listing state.
 */
export function parseArtistService(raw: unknown): ArtistService | null {
  return typeof raw === 'string' && (ARTIST_SERVICES as readonly string[]).includes(raw)
    ? (raw as ArtistService)
    : null
}

/**
 * Max length of the free-text keyword search term (HAR-455). Bounds the
 * `ilike` predicate so a pathologically long `?q=` can't blow up the query
 * string; user-meaningful searches are far shorter.
 */
export const LISTING_QUERY_MAX_LENGTH = 100

/**
 * Parse a raw `q` search param into a normalized keyword string or `null`
 * (HAR-455). Mirrors `parseArtistService`'s untrusted-string contract — the
 * page reads the value straight off `searchParams` so this never throws. Trims
 * surrounding whitespace, treats empty/whitespace-only as `null` (the
 * no-search default), and caps the length (post-trim) to bound the predicate.
 * Returns the normalized term or `null`.
 */
export function parseListingQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return trimmed.slice(0, LISTING_QUERY_MAX_LENGTH)
}

export const listingSearchParamsSchema = z.object({
  sort: listingSortSchema,
  budget: listingBudgetSchema,
})

export type ListingSearchParams = {
  sort: ArtistSort
  budget: ArtistBudget
  service: ArtistService | null
  /** Free-text keyword search term, or `null` for no search (HAR-455). */
  q: string | null
}

/**
 * Parse `/artists` search params into a validated, defaulted shape. Unrelated
 * params (style/city/page) are ignored here — they have their own handling on
 * the page. Unknown/absent `sort` → `featured`, `budget` → `any`,
 * `service` → `null` (no service predicate).
 */
export function parseListingSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListingSearchParams {
  return {
    sort: listingSortSchema.parse(searchParams.sort),
    budget: listingBudgetSchema.parse(searchParams.budget),
    service: parseArtistService(searchParams.service),
    q: parseListingQuery(searchParams.q),
  }
}

/**
 * Whether the `/artists` listing has ANY active filter relative to its bare
 * default view (HAR-435). True when a `style` or `city` is selected, the `sort`
 * is anything other than the `featured` default, the `budget` is anything other
 * than the `any` default, a `service` filter is set (HAR-446), or a non-empty
 * `q` keyword search is active (HAR-455). Drives the `清除篩選` (clear-filters)
 * affordance.
 */
export function hasActiveListingFilters(filters: {
  style?: string | null
  city?: string | null
  sort: ArtistSort
  budget: ArtistBudget
  service?: ArtistService | null
  q?: string | null
}): boolean {
  return (
    Boolean(filters.style) ||
    Boolean(filters.city) ||
    filters.sort !== 'featured' ||
    filters.budget !== 'any' ||
    Boolean(filters.service) ||
    Boolean(filters.q && filters.q.trim())
  )
}
