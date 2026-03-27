import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://inkhunt.tw'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/artist/dashboard', '/artist/portfolio', '/artist/profile', '/admin'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
