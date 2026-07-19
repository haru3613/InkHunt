import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/queries/styles', () => ({
  getAllStyles: vi.fn().mockResolvedValue([{ slug: 'fine-line' }]),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getAllArtistSlugs: vi.fn().mockResolvedValue([
    { slug: 'lin-tattoo', updated_at: '2026-01-01T00:00:00.000Z' },
  ]),
}))

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('sitemap', () => {
  it('emits locale-prefixed canonical URLs for every public page', async () => {
    const { default: sitemap } = await import('../sitemap')

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      'https://ink-hunt.com/zh-TW',
      'https://ink-hunt.com/en',
      'https://ink-hunt.com/zh-TW/artists',
      'https://ink-hunt.com/en/artists',
      'https://ink-hunt.com/zh-TW/about',
      'https://ink-hunt.com/en/about',
      'https://ink-hunt.com/zh-TW/privacy',
      'https://ink-hunt.com/en/privacy',
      'https://ink-hunt.com/zh-TW/terms',
      'https://ink-hunt.com/en/terms',
      'https://ink-hunt.com/zh-TW/styles/fine-line',
      'https://ink-hunt.com/en/styles/fine-line',
      'https://ink-hunt.com/zh-TW/artists/lin-tattoo',
      'https://ink-hunt.com/en/artists/lin-tattoo',
    ])
  })

  it('includes zh-TW and en hreflang alternates on every entry', async () => {
    const { default: sitemap } = await import('../sitemap')
    const entries = await sitemap()

    expect(entries).not.toHaveLength(0)
    for (const entry of entries) {
      const path = entry.url.replace(/^https:\/\/ink-hunt\.com\/(?:zh-TW|en)/, '')
      expect(entry.alternates?.languages).toEqual({
        'zh-TW': `https://ink-hunt.com/zh-TW${path}`,
        en: `https://ink-hunt.com/en${path}`,
      })
    }
  })
})
