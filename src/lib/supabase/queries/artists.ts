import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export type ArtistWithDetails = Omit<ArtistRow, 'admin_note' | 'line_user_id'> & {
  styles: StyleRow[]
  portfolio_items: PortfolioItemRow[]
}

export interface ArtistFilters {
  style?: string | null
  city?: string | null
  page?: number
  pageSize?: number
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
    .order('featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(start, end)

  if (artistIds) dataQuery = dataQuery.in('id', artistIds)
  if (filters?.city) dataQuery = dataQuery.eq('city', filters.city)

  const { data, error } = await dataQuery

  if (error) return { data: [], total: 0 }

  return {
    data: (data as unknown as SupabaseArtistRow[]).map(transformArtistRow),
    total,
  }
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
