import { safeAdminClient } from '@/lib/supabase/admin'
import { parseExploreFilters } from '@/lib/discovery/catalog'
import type { PortfolioItem } from '@/types/database'
import { reportError } from '@/lib/observability'

export type DiscoveryWork = Pick<PortfolioItem, 'id' | 'title' | 'description' | 'image_url' | 'body_part' | 'healed_image_url'> & {
  artists: { id: string; slug: string; display_name: string; city: string; avatar_url: string | null }
  styles: { slug: string; name: string; name_en: string | null } | null
}
export async function getDiscoveryWorks(input: Record<string, string | string[] | undefined> = {}, pageSize = 24) {
  const filters = parseExploreFilters(input)
  const admin = safeAdminClient()
  if (!admin) return { works: [] as DiscoveryWork[], total: 0, unavailable: true, ...filters }
  let query = admin.from('portfolio_items').select(
    `id,title,description,image_url,body_part,healed_image_url,artists!inner(id,slug,display_name,city,avatar_url),styles${filters.style ? '!inner' : ''}(slug,name,name_en)`,
    { count: 'exact' },
  ).eq('artists.status', 'active')
  if (filters.city) query = query.eq('artists.city', filters.city)
  if (filters.style) query = query.eq('styles.slug', filters.style)
  if (filters.subject) {
    // Only fixed vocabulary enters PostgREST syntax, never raw user input.
    query = query.or(filters.subject.words.flatMap(word => [`title.ilike.%${word}%`, `description.ilike.%${word}%`]).join(','))
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range((filters.page - 1) * pageSize, filters.page * pageSize - 1)
  if (error) { reportError('discovery-works', error); return { works: [] as DiscoveryWork[], total: 0, unavailable: true, ...filters } }
  return { works: (data ?? []) as unknown as DiscoveryWork[], total: count ?? 0, unavailable: false, ...filters }
}
