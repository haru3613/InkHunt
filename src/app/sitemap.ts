import type { MetadataRoute } from 'next'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { getArtists } from '@/lib/supabase/queries/artists'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://inkhunt.tw'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/artists`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  let stylePages: MetadataRoute.Sitemap = []
  try {
    const styles = await getAllStyles()
    stylePages = styles.map((style) => ({
      url: `${BASE_URL}/styles/${style.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Graceful degradation if Supabase is unreachable
  }

  let artistPages: MetadataRoute.Sitemap = []
  try {
    const { data: artists } = await getArtists({ pageSize: 1000 })
    artistPages = artists.map((artist) => ({
      url: `${BASE_URL}/artists/${artist.slug}`,
      lastModified: new Date(artist.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Graceful degradation if Supabase is unreachable
  }

  return [...staticPages, ...stylePages, ...artistPages]
}
