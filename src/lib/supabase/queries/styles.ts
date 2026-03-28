import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'

type StyleRow = Database['public']['Tables']['styles']['Row']

export async function getAllStyles(): Promise<StyleRow[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('styles')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch styles:', error.message)
    return []
  }

  return data
}

export async function getStyleBySlug(
  slug: string,
): Promise<StyleRow | null> {
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()
  const counts = new Map<string, number>()

  const { data: artistStyles, error: asError } = await supabase
    .from('artist_styles')
    .select('style_id, artists!inner(status)')
    .eq('artists.status', 'active')

  if (asError || !artistStyles) return counts

  const styleIdCounts = new Map<number, number>()
  for (const row of artistStyles) {
    styleIdCounts.set(row.style_id, (styleIdCounts.get(row.style_id) ?? 0) + 1)
  }

  const { data: styles } = await supabase
    .from('styles')
    .select('id, slug')

  if (!styles) return counts

  for (const style of styles) {
    const count = styleIdCounts.get(style.id) ?? 0
    counts.set(style.slug, count)
  }

  return counts
}
