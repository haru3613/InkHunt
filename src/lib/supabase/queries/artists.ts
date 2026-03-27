import type { Database } from '@/types/database'
import { mockArtists } from '@/lib/mock-data'

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

export async function getArtists(
  filters?: ArtistFilters,
): Promise<{ data: ArtistWithDetails[]; total: number }> {
  // TODO: Replace with Supabase query
  let filtered = [...mockArtists]

  if (filters?.style) {
    filtered = filtered.filter((artist) =>
      artist.styles.some((s) => s.slug === filters.style),
    )
  }

  if (filters?.city) {
    filtered = filtered.filter((artist) => artist.city === filters.city)
  }

  const total = filtered.length
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)

  return { data, total }
}

export async function getArtistBySlug(
  slug: string,
): Promise<ArtistWithDetails | null> {
  // TODO: Replace with Supabase query
  return mockArtists.find((a) => a.slug === slug) ?? null
}

export async function getFeaturedArtists(
  limit = 6,
): Promise<ArtistWithDetails[]> {
  // TODO: Replace with Supabase query
  return mockArtists.filter((a) => a.featured).slice(0, limit)
}
