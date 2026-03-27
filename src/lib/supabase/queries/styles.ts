import type { Database } from '@/types/database'
import { mockStyles, mockArtists } from '@/lib/mock-data'

type StyleRow = Database['public']['Tables']['styles']['Row']

export async function getAllStyles(): Promise<StyleRow[]> {
  // TODO: Replace with Supabase query
  return [...mockStyles]
}

export async function getStyleBySlug(
  slug: string,
): Promise<StyleRow | null> {
  // TODO: Replace with Supabase query
  return mockStyles.find((s) => s.slug === slug) ?? null
}

export async function getArtistCountByStyle(
  styleSlug: string,
): Promise<number> {
  // TODO: Replace with Supabase query
  return mockArtists.filter((artist) =>
    artist.styles.some((s) => s.slug === styleSlug),
  ).length
}

export async function getAllArtistCounts(): Promise<Map<string, number>> {
  // TODO: Replace with single GROUP BY Supabase query
  const counts = new Map<string, number>()
  for (const artist of mockArtists) {
    for (const style of artist.styles) {
      counts.set(style.slug, (counts.get(style.slug) ?? 0) + 1)
    }
  }
  return counts
}
