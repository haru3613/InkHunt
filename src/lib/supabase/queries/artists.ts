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

export type ArtistWithDetails = ArtistRow & {
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

interface SupabaseArtistRow extends ArtistRow {
  artist_styles: Array<{ styles: StyleRow }>
  portfolio_items: PortfolioItemRow[]
}

export function transformArtistRow(row: SupabaseArtistRow): ArtistWithDetails {
  const { artist_styles, ...artist } = row
  return {
    ...artist,
    styles: artist_styles
      .map((as) => as.styles)
      .filter((s): s is StyleRow => s !== null),
    portfolio_items: row.portfolio_items.sort(
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
      .select('artist_id')
      .eq('style_id', style.id)

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
    .select('*, artist_styles(styles(*)), portfolio_items(*)')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(start, end)

  if (artistIds) dataQuery = dataQuery.in('id', artistIds)
  if (filters?.city) dataQuery = dataQuery.eq('city', filters.city)

  const { data, error } = await dataQuery

  if (error) {
    console.error('Failed to fetch artists:', error.message)
    return { data: [], total: 0 }
  }

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
    .select('*, artist_styles(styles(*)), portfolio_items(*)')
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
    .select('*, artist_styles(styles(*)), portfolio_items(*)')
    .eq('status', 'active')
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (data as unknown as SupabaseArtistRow[]).map(transformArtistRow)
}
