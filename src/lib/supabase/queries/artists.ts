import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeReviewSummary } from '@/lib/reviews'

function safeAdminClient(): SupabaseClient<Database> | null {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

type ArtistRow = Database['public']['Tables']['artists']['Row']
type StyleRow = Database['public']['Tables']['styles']['Row']
type PortfolioItemRow = Database['public']['Tables']['portfolio_items']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']

/** Compact, listing-surface rating summary attached to each card (HAR-417). */
export interface ArtistReviewSummary {
  /** Mean rating, rounded to 1 decimal place. */
  average: number
  /** Number of reviews. `0` when the artist has none. */
  count: number
}

export type ArtistWithDetails = Omit<ArtistRow, 'admin_note' | 'line_user_id'> & {
  styles: StyleRow[]
  portfolio_items: PortfolioItemRow[]
  /**
   * Per-artist review rating summary for the browse/compare surface (HAR-417).
   * Omitted (or `count === 0`) when the artist has no reviews so the card stays
   * clean for unreviewed artists.
   */
  reviewSummary?: ArtistReviewSummary
}

/**
 * Listing sort order for `/artists` (HAR-433). `featured` is the default
 * discovery order; the price/recency options are pure read-side ordering.
 * `rating` (評分最高, HAR-474) is the parser-recognized value for rate-aware
 * ranking; the read-side ordering for it lands in a follow-up (HAR-B) and for
 * now falls through to the `featured` default in the query switch.
 */
export type ArtistSort = 'featured' | 'price_low' | 'price_high' | 'newest' | 'rating'

/**
 * Budget bucket for `/artists` (HAR-434). Filters on the artist's entry price
 * `price_min`. `any` applies no price predicate (the default).
 */
export type ArtistBudget = 'any' | 'le3000' | 'le6000' | 'le10000' | 'gt10000'

/**
 * Service-offering filter for `/artists` (HAR-446). Filters on an already-stored
 * boolean column: `coverup` → `offers_coverup`, `flash` → `has_flash_designs`.
 * Absent/`null` applies no service predicate (the default). `offers_custom_design`
 * is intentionally excluded — it DEFAULTs true, so it is near-universal and
 * low-signal as a discovery filter.
 */
export type ArtistService = 'coverup' | 'flash'

export interface ArtistFilters {
  style?: string | null
  city?: string | null
  page?: number
  pageSize?: number
  /** Listing sort order; unknown/absent → `featured` (HAR-433). */
  sort?: ArtistSort
  /** Budget bucket on `price_min`; unknown/absent → `any` / no predicate (HAR-434). */
  budget?: ArtistBudget
  /** Service-offering predicate; absent/`null` → no predicate (HAR-446). */
  service?: ArtistService | null
  /**
   * Free-text keyword search term (HAR-455). When a non-empty string, applies
   * a `display_name`/`bio` `ilike` substring match. Absent/`null`/empty → no
   * predicate (byte-identical to the unfiltered query).
   */
  q?: string | null
  /**
   * Minimum aggregate rating (HAR-475). When a non-null number, keeps only
   * artists whose `artist_rating_summary.avg_rating` ≥ `minRating` (the SAME
   * `.gte('avg_rating', …)` predicate lands on both the count and data queries
   * so `total` cannot drift). Absent/`null` → no predicate (byte-identical to
   * the unfiltered query).
   */
  minRating?: number | null
}

const DEFAULT_PAGE_SIZE = 12

/**
 * Map a budget bucket to its `price_min` predicate (HAR-434). `null` means "no
 * predicate" (the `any` / absent case). Kept as a single source of truth so the
 * SAME predicate lands on both the count query and the data query — otherwise
 * `total` drifts from the rows actually returned.
 */
type PriceMinPredicate = { op: 'lte' | 'gte'; value: number }

function budgetPredicate(budget: ArtistBudget | undefined): PriceMinPredicate | null {
  switch (budget) {
    case 'le3000':
      return { op: 'lte', value: 3000 }
    case 'le6000':
      return { op: 'lte', value: 6000 }
    case 'le10000':
      return { op: 'lte', value: 10000 }
    case 'gt10000':
      return { op: 'gte', value: 10000 }
    case 'any':
    default:
      return null
  }
}

/**
 * Map a service filter to its boolean artist column (HAR-446). `null` means "no
 * predicate" (absent/`null` case). Single source of truth so the SAME
 * `.eq(column, true)` lands on both the count and data queries — otherwise
 * `total` drifts from the rows actually returned.
 */
function serviceColumn(service: ArtistService | null | undefined): keyof ArtistRow | null {
  switch (service) {
    case 'coverup':
      return 'offers_coverup'
    case 'flash':
      return 'has_flash_designs'
    default:
      return null
  }
}

/**
 * Escape a user keyword term so its `%`/`_` match LITERALLY under SQL `LIKE`
 * (HAR-455, retained HAR-458). The PostgREST grammar layer (commas, `*`, `(`,
 * `)`, `:`) is handled separately by `quotePostgrestValue` — this function ONLY
 * neutralizes the SQL LIKE wildcards that PostgREST passes straight through to
 * Postgres. Backslash-escape `\` first (it is the LIKE escape char), then `%`
 * and `_`. The comma is NOT escaped here: once the whole value is double-quote
 * wrapped (below) the comma is inert to the PostgREST `.or()` grammar.
 */
function escapeSearchTerm(term: string): string {
  return term
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Wrap a filter value in PostgREST double quotes so every reserved char in the
 * grammar (`,` OR-delimiter, `*` wildcard alias, `(` `)` group parens, `:`,
 * `.`) becomes inert literal text (HAR-458). The documented, complete fix per
 * the PostgREST docs ("if a filter value contains reserved characters it must
 * be wrapped in double quotes"): inside a quoted value the only chars needing
 * escaping are the quote `"` (→ `\"`) and the backslash `\` (→ `\\`).
 * supabase-js percent-encodes the resulting `.or()` string for the wire.
 */
function quotePostgrestValue(value: string): string {
  const inner = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${inner}"`
}

/**
 * Build the name/bio keyword `.or()` filter string ONCE (HAR-455, hardened
 * HAR-458) so the SAME predicate lands on both the count and data queries —
 * otherwise `total` drifts from the rows returned. Returns `null` for
 * absent/empty/whitespace-only `q` (no predicate, byte-identical to the
 * unfiltered query).
 *
 * Two escaping layers, applied inside-out:
 *   1. {@link escapeSearchTerm} — `%`/`_`/`\` so the user's literal wildcards
 *      match literally under SQL LIKE (PostgREST passes these through verbatim).
 *   2. {@link quotePostgrestValue} — double-quote-wrap the whole `%term%` value
 *      so the PostgREST filter grammar treats `* ( ) : ,` as inert literals.
 * The framing `%…%` stays OUTSIDE the user term so it remains a real LIKE
 * substring wildcard.
 */
function searchPredicate(q: string | null | undefined): string | null {
  if (!q) return null
  const term = q.trim()
  if (term === '') return null
  const quoted = quotePostgrestValue(`%${escapeSearchTerm(term)}%`)
  return `display_name.ilike.${quoted},bio.ilike.${quoted}`
}

export const ARTIST_PUBLIC_SELECT = `
  id, slug, display_name, bio, avatar_url, ig_handle,
  city, district, address, lat, lng,
  price_min, price_max, pricing_note, deposit_amount,
  booking_notice, status, is_claimed, featured,
  offers_coverup, offers_custom_design, has_flash_designs,
  created_at, updated_at,
  artist_styles(styles(*)), portfolio_items(*)
` as const

/**
 * Embed the `artist_rating_summary` view (HAR-436) as a PostgREST relationship
 * so the rating sort / `minRating` filter can `.order`/`.gte` against the
 * view's `avg_rating` over the WHOLE artist set at query time — shape (a) of
 * HAR-475 (the codebase already reads embedded relationships in
 * `ARTIST_PUBLIC_SELECT`, so this is the consistent shape). `!inner` makes the
 * embed restrict the parent rows, so a `.gte('avg_rating', …)` on the data
 * query and the same `.gte` on the `count` query filter the same set (no
 * `total` drift). Appended to the select ONLY when a rating facet is active;
 * absent rating facet → the select is byte-identical to today's query.
 */
const ARTIST_RATING_EMBED = 'artist_rating_summary!inner(avg_rating, review_count)'

interface SupabaseArtistRow extends Omit<ArtistRow, 'admin_note' | 'line_user_id'> {
  artist_styles: Array<{ styles: StyleRow | null }>
  portfolio_items: PortfolioItemRow[]
}

export function transformArtistRow(row: SupabaseArtistRow): ArtistWithDetails {
  const { artist_styles, ...artist } = row
  return {
    ...artist,
    styles: artist_styles
      .map((as) => as.styles)
      .filter((s): s is StyleRow => s !== null),
    portfolio_items: [...row.portfolio_items].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }
}

/** Columns of the `reviews` table the listing aggregation needs. */
type ReviewRatingRow = Pick<ReviewRow, 'artist_id' | 'rating'>

/**
 * Fetch review ratings for a page of artists in a SINGLE bounded query and
 * aggregate `{ average, count }` per artist (no N+1 — one `.in('artist_id', …)`
 * select for the whole page). Always resolves: degrades to an empty map on a
 * missing client, a query error, or a null result so the listing still renders
 * cards without a rating instead of throwing.
 */
async function getReviewSummariesByArtistIds(
  supabase: SupabaseClient<Database>,
  artistIds: string[],
): Promise<Map<string, ArtistReviewSummary>> {
  const summaries = new Map<string, ArtistReviewSummary>()
  if (artistIds.length === 0) return summaries

  const { data, error } = await supabase
    .from('reviews')
    .select('artist_id, rating')
    .in('artist_id', artistIds)

  if (error || !data) return summaries

  const ratingsByArtist = new Map<string, { rating: number }[]>()
  for (const row of data as ReviewRatingRow[]) {
    const bucket = ratingsByArtist.get(row.artist_id)
    if (bucket) bucket.push({ rating: row.rating })
    else ratingsByArtist.set(row.artist_id, [{ rating: row.rating }])
  }

  for (const [artistId, ratings] of ratingsByArtist) {
    const { average, count } = computeReviewSummary(ratings)
    summaries.set(artistId, { average, count })
  }

  return summaries
}

export async function getArtists(
  filters?: ArtistFilters,
): Promise<{ data: ArtistWithDetails[]; total: number }> {
  const supabase = safeAdminClient()
  if (!supabase) return { data: [], total: 0 }
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE

  let artistIds: string[] | null = null

  if (filters?.style) {
    const { data: style } = await supabase
      .from('styles')
      .select('id')
      .eq('slug', filters.style)
      .single()

    if (!style) return { data: [], total: 0 }

    const { data: matches } = await supabase
      .from('artist_styles')
      .select('artist_id, artists!inner(status)')
      .eq('style_id', style.id)
      .eq('artists.status', 'active')

    if (!matches || matches.length === 0) return { data: [], total: 0 }

    artistIds = matches.map((m) => m.artist_id)
  }

  // HAR-434: resolve the budget `price_min` predicate ONCE so the identical
  // filter lands on both the count and data queries (keeps `total` accurate).
  const pricePred = budgetPredicate(filters?.budget)

  // HAR-446: resolve the service boolean column ONCE for the same reason — the
  // SAME `.eq(column, true)` must land on both queries or `total` drifts.
  const svcColumn = serviceColumn(filters?.service)

  // HAR-455: resolve the name/bio keyword `.or()` filter string ONCE so the
  // SAME predicate lands on both queries — otherwise `total` drifts. `null`
  // when no/empty search term (no predicate, byte-identical to today's query).
  const searchOr = searchPredicate(filters?.q)

  // HAR-475: a rating facet (sort by rating OR a minRating floor) needs the
  // `artist_rating_summary` view embedded so the order/filter runs against the
  // WHOLE set in the DB, not just the JS-aggregated page. `minRating` resolved
  // ONCE so the identical `.gte('avg_rating', …)` lands on both queries (no
  // `total` drift). `null` minRating → no predicate.
  const minRating = filters?.minRating ?? null
  const ratingSort = filters?.sort === 'rating'
  // The embed must be present on a query whenever EITHER rating facet is active
  // (the sort orders by the embed's column; the filter restricts via `!inner`).
  const ratingEmbedNeeded = ratingSort || minRating != null

  let countQuery = supabase
    .from('artists')
    // Embed the rating view only when a rating facet is active so the count
    // stays byte-identical to today's query otherwise. `!inner` makes the
    // `.gte('avg_rating', …)` below restrict the counted rows.
    .select(ratingEmbedNeeded ? `*, ${ARTIST_RATING_EMBED}` : '*', {
      count: 'exact',
      head: true,
    })
    .eq('status', 'active')

  if (artistIds) countQuery = countQuery.in('id', artistIds)
  if (filters?.city) countQuery = countQuery.eq('city', filters.city)
  if (pricePred) {
    countQuery =
      pricePred.op === 'lte'
        ? countQuery.lte('price_min', pricePred.value)
        : countQuery.gte('price_min', pricePred.value)
  }
  if (svcColumn) countQuery = countQuery.eq(svcColumn, true)
  if (searchOr) countQuery = countQuery.or(searchOr)
  // Same minRating floor on the count query as the data query → `total` matches
  // the rows returned (the predicate references the embedded view's column).
  if (minRating != null) countQuery = countQuery.gte('avg_rating', minRating)

  const { count } = await countQuery
  const total = count ?? 0

  if (total === 0) return { data: [], total: 0 }

  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  let dataQuery = supabase
    .from('artists')
    // Embed the rating view only when a rating facet is active so the unfiltered
    // select stays byte-identical to today's query otherwise (HAR-475).
    .select(ratingEmbedNeeded ? `${ARTIST_PUBLIC_SELECT}, ${ARTIST_RATING_EMBED}` : ARTIST_PUBLIC_SELECT)
    .eq('status', 'active')

  // HAR-433: branch the listing order. HAR-475 adds `rating` → order by the
  // embedded `artist_rating_summary.avg_rating` DESC; zero-review artists
  // (`avg_rating = 0` via the view's COALESCE, or a null aggregate) sort LAST
  // via `nullsFirst: false`. Unknown/absent sort falls through to the
  // `featured → updated_at` default discovery order.
  switch (filters?.sort) {
    case 'rating':
      dataQuery = dataQuery.order('avg_rating', {
        ascending: false,
        foreignTable: 'artist_rating_summary',
        nullsFirst: false,
      })
      break
    case 'price_low':
      dataQuery = dataQuery.order('price_min', { ascending: true, nullsFirst: false })
      break
    case 'price_high':
      dataQuery = dataQuery.order('price_max', { ascending: false, nullsFirst: false })
      break
    case 'newest':
      dataQuery = dataQuery.order('created_at', { ascending: false })
      break
    case 'featured':
    default:
      dataQuery = dataQuery
        .order('featured', { ascending: false })
        .order('updated_at', { ascending: false })
      break
  }

  dataQuery = dataQuery.range(start, end)

  if (artistIds) dataQuery = dataQuery.in('id', artistIds)
  if (filters?.city) dataQuery = dataQuery.eq('city', filters.city)
  if (pricePred) {
    dataQuery =
      pricePred.op === 'lte'
        ? dataQuery.lte('price_min', pricePred.value)
        : dataQuery.gte('price_min', pricePred.value)
  }
  if (svcColumn) dataQuery = dataQuery.eq(svcColumn, true)
  if (searchOr) dataQuery = dataQuery.or(searchOr)
  // Same minRating floor as the count query (HAR-475) → rows match `total`.
  if (minRating != null) dataQuery = dataQuery.gte('avg_rating', minRating)

  const { data, error } = await dataQuery

  if (error) return { data: [], total: 0 }

  const artists = (data as unknown as SupabaseArtistRow[]).map(transformArtistRow)

  // Attach a per-artist rating summary fetched in ONE bounded query (no N+1).
  const summaries = await getReviewSummariesByArtistIds(
    supabase,
    artists.map((a) => a.id),
  )
  for (const artist of artists) {
    const summary = summaries.get(artist.id)
    if (summary && summary.count > 0) artist.reviewSummary = summary
  }

  return { data: artists, total }
}

export async function getArtistBySlug(
  slug: string,
): Promise<ArtistWithDetails | null> {
  const supabase = safeAdminClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_PUBLIC_SELECT)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return transformArtistRow(data as unknown as SupabaseArtistRow)
}

export async function getFeaturedArtists(
  limit = 6,
): Promise<ArtistWithDetails[]> {
  const supabase = safeAdminClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_PUBLIC_SELECT)
    .eq('status', 'active')
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (data as unknown as SupabaseArtistRow[]).map(transformArtistRow)
}

export async function getAllArtistSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const supabase = safeAdminClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('artists')
    .select('slug, updated_at')
    .eq('status', 'active')

  if (error || !data) return []

  return data
}
