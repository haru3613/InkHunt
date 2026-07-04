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
  it('uses ink-hunt.com for static and dynamic URLs by default', async () => {
    const { default: sitemap } = await import('../sitemap')

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      'https://ink-hunt.com',
      'https://ink-hunt.com/artists',
      'https://ink-hunt.com/styles/fine-line',
      'https://ink-hunt.com/artists/lin-tattoo',
    ])
  })
})
