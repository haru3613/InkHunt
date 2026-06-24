import { z } from 'zod'
import type { ArtistSort, ArtistBudget, ArtistService } from '@/lib/supabase/queries/artists'

/**
 * Valid `/artists` listing sort values (HAR-433). Kept in sync with
 * `ArtistSort` in the artists query layer. `rating` (評分最高) was added in
 * HAR-474 for rate-aware ranking; its read-side ordering lands in a follow-up.
 */
export const ARTIST_SORTS = ['featured', 'price_low', 'price_high', 'newest', 'rating'] as const

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

/**
 * Allowed discrete `minRating` filter values (HAR-474). A fixed allowlist —
 * NOT an arbitrary float range — keeps the rating predicate bounded: only
 * "4★ and up" and "4.5★ and up" are offered as discovery thresholds. Mirrors
 * the budget/service bucket convention.
 */
export const ALLOWED_MIN_RATINGS = [4, 4.5] as const

/**
 * Parse a raw `minRating` search param into one of the allowed discrete rating
 * thresholds (`4` or `4.5`) or `null` (HAR-474). Mirrors `parseArtistService`'s
 * untrusted-string contract — the page reads the value straight off
 * `searchParams` so this never throws — but accepts BOTH the string form
 * (`'4'`, `'4.5'`) and the numeric form (`4`, `4.5`). Anything else —
 * absent/empty/non-numeric input, or a number outside the allowlist (`3`, `5`,
 * `0`, negatives, arbitrary floats) — resolves to `null` (no rating predicate),
 * the bare-listing state.
 */
export function parseMinRating(raw: unknown): number | null {
  let value: number
  if (typeof raw === 'number') {
    value = raw
  } else if (typeof raw === 'string') {
    if (raw.trim() === '') return null
    // Number(' 4 ') === 4, but trailing/leading whitespace is not a valid param
    // form here, so reject it explicitly rather than silently coercing.
    if (raw !== raw.trim()) return null
    value = Number(raw)
  } else {
    return null
  }
  if (!Number.isFinite(value)) return null
  return (ALLOWED_MIN_RATINGS as readonly number[]).includes(value) ? value : null
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
  /** Minimum rating threshold (`4` or `4.5`), or `null` for no filter (HAR-474). */
  minRating: number | null
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
    minRating: parseMinRating(searchParams.minRating),
  }
}

/**
 * Whether the `/artists` listing has ANY active filter relative to its bare
 * default view (HAR-435). True when a `style` or `city` is selected, the `sort`
 * is anything other than the `featured` default, the `budget` is anything other
 * than the `any` default, a `service` filter is set (HAR-446), a non-empty `q`
 * keyword search is active (HAR-455), or a `minRating` threshold is set
 * (HAR-474). Drives the `清除篩選` (clear-filters) affordance.
 */
export function hasActiveListingFilters(filters: {
  style?: string | null
  city?: string | null
  sort: ArtistSort
  budget: ArtistBudget
  service?: ArtistService | null
  q?: string | null
  minRating?: number | null
}): boolean {
  return (
    Boolean(filters.style) ||
    Boolean(filters.city) ||
    filters.sort !== 'featured' ||
    filters.budget !== 'any' ||
    Boolean(filters.service) ||
    Boolean(filters.q && filters.q.trim()) ||
    filters.minRating != null
  )
}
