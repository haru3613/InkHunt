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

type StyleRow = Database['public']['Tables']['styles']['Row']

export async function getAllStyles(): Promise<StyleRow[]> {
  const supabase = safeAdminClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('styles')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return []

  return data
}

export async function getStyleBySlug(
  slug: string,
): Promise<StyleRow | null> {
  const supabase = safeAdminClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('styles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null

  return data
}

export async function getArtistCountByStyle(
  styleSlug: string,
): Promise<number> {
  const supabase = safeAdminClient()
  if (!supabase) return 0

  const { data: style } = await supabase
    .from('styles')
    .select('id')
    .eq('slug', styleSlug)
    .single()

  if (!style) return 0

  const { count, error } = await supabase
    .from('artist_styles')
    .select('artist_id, artists!inner(status)', { count: 'exact', head: true })
    .eq('style_id', style.id)
    .eq('artists.status', 'active')

  if (error) return 0

  return count ?? 0
}

export async function getAllArtistCounts(): Promise<Map<string, number>> {
  const supabase = safeAdminClient()
  if (!supabase) return new Map()
  const counts = new Map<string, number>()

  // Get all styles first
  const { data: styles } = await supabase
    .from('styles')
    .select('id, slug')

  if (!styles) return counts

  // Get all artist_style links for active artists
  const { data: artistStyles, error: asError } = await supabase
    .from('artist_styles')
    .select('style_id, artists!inner(status)')
    .eq('artists.status', 'active')

  if (asError || !artistStyles) {
    // If query fails, return all zeros
    for (const style of styles) {
      counts.set(style.slug, 0)
    }
    return counts
  }

  // Count by style_id
  const styleIdCounts = new Map<number, number>()
  for (const row of artistStyles) {
    styleIdCounts.set(row.style_id, (styleIdCounts.get(row.style_id) ?? 0) + 1)
  }

  // Map style IDs to slugs
  for (const style of styles) {
    counts.set(style.slug, styleIdCounts.get(style.id) ?? 0)
  }

  return counts
}

/**
 * Representative portfolio image per style (style slug → image_url), drawn from
 * ACTIVE artists' work only. Mirrors the active-gate of `getAllArtistCounts`:
 * pending-artist work never surfaces on the public discovery grid. One image
 * per style — lowest `sort_order`, tie-break most recent — so the grid gets a
 * stable, artist-curated hero shot. Styles with no active-artist work are
 * simply absent from the map (StyleGrid falls back to its placeholder).
 */
export async function getStyleSampleImages(): Promise<Map<string, string>> {
  const supabase = safeAdminClient()
  if (!supabase) return new Map()
  const images = new Map<string, string>()

  // portfolio_items carries style_id; the grid is keyed by slug — map id → slug.
  const { data: styles } = await supabase.from('styles').select('id, slug')
  if (!styles) return images

  // Ordered so the FIRST row seen per style_id is the winner.
  const { data: items, error } = await supabase
    .from('portfolio_items')
    .select('style_id, image_url, artists!inner(status)')
    .eq('artists.status', 'active')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !items) return images

  const slugById = new Map<number, string>()
  for (const style of styles) slugById.set(style.id, style.slug)

  for (const item of items) {
    if (item.style_id == null) continue
    const slug = slugById.get(item.style_id)
    if (!slug || images.has(slug)) continue
    images.set(slug, item.image_url)
  }

  return images
}
