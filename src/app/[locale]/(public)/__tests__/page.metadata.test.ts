import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('@/lib/supabase/queries/styles', () => ({
  getAllStyles: vi.fn(),
  getAllArtistCounts: vi.fn(),
  getStyleSampleImages: vi.fn(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getFeaturedArtists: vi.fn(),
  getNewArtists: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: vi.fn(),
}))

import { generateMetadata as generateHomeMetadata } from '../page'
import { generateMetadata as generateAboutMetadata } from '../about/page'
import { generateMetadata as generatePrivacyMetadata } from '../privacy/page'
import { generateMetadata as generateTermsMetadata } from '../terms/page'

const STATIC_PAGES = [
  ['home', '', generateHomeMetadata],
  ['about', '/about', generateAboutMetadata],
  ['privacy', '/privacy', generatePrivacyMetadata],
  ['terms', '/terms', generateTermsMetadata],
] as const

describe('public static page metadata', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(STATIC_PAGES)('%s resolves its own locale-aware canonical', async (_, path, generateMetadata) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })

    expect(metadata.alternates).toEqual({
      canonical: `https://ink-hunt.com/en${path}`,
      languages: {
        'zh-TW': `https://ink-hunt.com/zh-TW${path}`,
        en: `https://ink-hunt.com/en${path}`,
      },
    })
  })
})
