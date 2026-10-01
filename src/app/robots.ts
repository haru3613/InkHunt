import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ink-hunt.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*/artist/dashboard', '/*/artist/portfolio', '/*/artist/profile', '/*/artist/onboarding', '/*/artist/inquiries', '/*/inquiries', '/*/favorites', '/*/admin', '/admin'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
