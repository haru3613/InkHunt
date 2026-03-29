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
