import type { MetadataRoute } from 'next'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { getAllArtistSlugs } from '@/lib/supabase/queries/artists'
import { buildLocalizedAlternates } from '@/lib/metadata'
import { routing } from '@/i18n/routing'

function localizedEntries(
  path: string,
  metadata: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages = buildLocalizedAlternates('zh-TW', path).languages

  return routing.locales.map((locale) => ({
    ...metadata,
    url: buildLocalizedAlternates(locale, path).canonical,
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    ...localizedEntries('', {
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }),
    ...localizedEntries('/artists', {
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...['/about', '/privacy', '/terms'].flatMap((path) =>
      localizedEntries(path, {
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
    ),
  ]

  let stylePages: MetadataRoute.Sitemap = []
  try {
    const styles = await getAllStyles()
    stylePages = styles.flatMap((style) => localizedEntries(`/styles/${style.slug}`, {
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Graceful degradation if Supabase is unreachable
  }

  let artistPages: MetadataRoute.Sitemap = []
  try {
    const artists = await getAllArtistSlugs()
    artistPages = artists.flatMap((artist) => localizedEntries(`/artists/${artist.slug}`, {
      lastModified: new Date(artist.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Graceful degradation if Supabase is unreachable
  }

  return [...staticPages, ...stylePages, ...artistPages]
}
