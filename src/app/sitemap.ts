import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://inkhunt.tw'

// Tattoo style slugs for static generation
const STYLE_SLUGS = [
  'realism', 'geometric', 'japanese-traditional', 'american-traditional',
  'neo-traditional', 'watercolor', 'fine-line', 'blackwork', 'floral',
  'lettering', 'dotwork', 'tribal', 'illustrative', 'anime',
  'portrait', 'micro', 'coverup',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
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

  // Style category pages
  const stylePages: MetadataRoute.Sitemap = STYLE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/styles/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // TODO: Add dynamic artist pages when Supabase is connected
  // const supabase = await createServerClient()
  // const { data: artists } = await supabase.from('artists').select('slug, updated_at').eq('status', 'active')
  // const artistPages = artists?.map(...)

  return [...staticPages, ...stylePages]
}
