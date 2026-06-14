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
 */
export type ArtistSort = 'featured' | 'price_low' | 'price_high' | 'newest'

export interface ArtistFilters {
  style?: string | null
  city?: string | null
  page?: number
  pageSize?: number
  /** Listing sort order; unknown/absent → `featured` (HAR-433). */
  sort?: ArtistSort
}

const DEFAULT_PAGE_SIZE = 12

const ARTIST_PUBLIC_SELECT = `
  id, slug, display_name, bio, avatar_url, ig_handle,
  city, district, address, lat, lng,
  price_min, price_max, pricing_note, deposit_amount,
  booking_notice, status, is_claimed, featured,
  offers_coverup, offers_custom_design, has_flash_designs,
  created_at, updated_at,
  artist_styles(styles(*)), portfolio_items(*)
` as const

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

  let countQuery = supabase
    .from('artists')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  if (artistIds) countQuery = countQuery.in('id', artistIds)
  if (filters?.city) countQuery = countQuery.eq('city', filters.city)

  const { count } = await countQuery
  const total = count ?? 0

  if (total === 0) return { data: [], total: 0 }

  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  let dataQuery = supabase
    .from('artists')
    .select(ARTIST_PUBLIC_SELECT)
    .eq('status', 'active')

  // HAR-433: branch the listing order. Unknown/absent sort falls through to the
  // `featured → updated_at` default discovery order.
  switch (filters?.sort) {
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
