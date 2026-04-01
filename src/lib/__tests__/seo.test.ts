import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateArtistJsonLd,
  generateStyleCollectionJsonLd,
  generateWebsiteJsonLd,
} from '@/lib/seo'

// seo.ts reads NEXT_PUBLIC_BASE_URL at module load time, so we must reset
// the module between env-var tests to pick up the new value.
beforeEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// generateArtistJsonLd
// ---------------------------------------------------------------------------

describe('generateArtistJsonLd', () => {
  const fullArtist = {
    display_name: '林刺青',
    bio: '專精黑灰寫實，十年經驗',
    avatar_url: 'https://example.com/avatar.jpg',
    city: '台北市',
    district: '大安區',
    slug: 'lin-tattoo',
    price_min: 3000,
    price_max: 20000,
    ig_handle: '@lin_tattoo',
  }

  it('sets @context and @type correctly', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('TattooParlor')
  })

  it('maps display_name to name', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.name).toBe('林刺青')
  })

  it('uses bio as description when bio is provided', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.description).toBe('專精黑灰寫實，十年經驗')
  })

  it('sets image from avatar_url', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.image).toBe('https://example.com/avatar.jpg')
  })

  it('builds address with city, district and addressCountry TW', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: '台北市',
      addressRegion: '大安區',
      addressCountry: 'TW',
    })
  })

  it('formats priceRange from price_min and price_max', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.priceRange).toBe('NT$3,000~NT$20,000')
  })

  it('builds url using default base URL and slug', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.url).toBe('https://inkhunt.tw/artists/lin-tattoo')
  })

  it('includes sameAs with Instagram URL when ig_handle is provided', () => {
    const result = generateArtistJsonLd(fullArtist)
    expect(result.sameAs).toEqual(['https://instagram.com/lin_tattoo'])
  })

  // --- null / undefined optional fields ---

  it('falls back to default description when bio is null', () => {
    const result = generateArtistJsonLd({ ...fullArtist, bio: null })
    expect(result.description).toBe('林刺青 的刺青作品集')
  })

  it('falls back to default description when bio is undefined', () => {
    const result = generateArtistJsonLd({ ...fullArtist, bio: undefined })
    expect(result.description).toBe('林刺青 的刺青作品集')
  })

  it('sets image to undefined when avatar_url is null', () => {
    const result = generateArtistJsonLd({ ...fullArtist, avatar_url: null })
    expect(result.image).toBeUndefined()
  })

  it('sets addressRegion to undefined when district is null', () => {
    const result = generateArtistJsonLd({ ...fullArtist, district: null })
    expect(result.address.addressRegion).toBeUndefined()
  })

  it('sets addressRegion to undefined when district is undefined', () => {
    const result = generateArtistJsonLd({ ...fullArtist, district: undefined })
    expect(result.address.addressRegion).toBeUndefined()
  })

  it('sets priceRange to undefined when both price_min and price_max are null', () => {
    const result = generateArtistJsonLd({ ...fullArtist, price_min: null, price_max: null })
    expect(result.priceRange).toBeUndefined()
  })

  it('formats priceRange with only price_min', () => {
    const result = generateArtistJsonLd({ ...fullArtist, price_min: 5000, price_max: null })
    expect(result.priceRange).toBe('NT$5,000 起')
  })

  it('formats priceRange with only price_max', () => {
    const result = generateArtistJsonLd({ ...fullArtist, price_min: null, price_max: 15000 })
    expect(result.priceRange).toBe('最高 NT$15,000')
  })

  it('sets sameAs to undefined when ig_handle is null', () => {
    const result = generateArtistJsonLd({ ...fullArtist, ig_handle: null })
    expect(result.sameAs).toBeUndefined()
  })

  it('sets sameAs to undefined when ig_handle is undefined', () => {
    const result = generateArtistJsonLd({ ...fullArtist, ig_handle: undefined })
    expect(result.sameAs).toBeUndefined()
  })

  it('sets sameAs to undefined when ig_handle is invalid', () => {
    // formatIgUrl returns null for invalid handles; sameAs should be undefined
    const result = generateArtistJsonLd({ ...fullArtist, ig_handle: 'invalid handle!' })
    expect(result.sameAs).toBeUndefined()
  })

  // --- minimal required fields only ---

  it('renders correctly with only required fields', () => {
    const minimal = {
      display_name: '極簡師',
      city: '高雄市',
      slug: 'minimal-artist',
    }
    const result = generateArtistJsonLd(minimal)
    expect(result['@type']).toBe('TattooParlor')
    expect(result.name).toBe('極簡師')
    expect(result.description).toBe('極簡師 的刺青作品集')
    expect(result.image).toBeUndefined()
    expect(result.address.addressLocality).toBe('高雄市')
    expect(result.address.addressRegion).toBeUndefined()
    expect(result.priceRange).toBeUndefined()
    expect(result.url).toBe('https://inkhunt.tw/artists/minimal-artist')
    expect(result.sameAs).toBeUndefined()
  })

  it('respects NEXT_PUBLIC_BASE_URL env var for artist URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.inkhunt.tw')
    const { generateArtistJsonLd: gen } = await import('@/lib/seo')
    const result = gen(fullArtist)
    expect(result.url).toBe('https://staging.inkhunt.tw/artists/lin-tattoo')
  })
})

// ---------------------------------------------------------------------------
// generateStyleCollectionJsonLd
// ---------------------------------------------------------------------------

describe('generateStyleCollectionJsonLd', () => {
  const style = {
    name: '極簡線條',
    slug: 'fine-line',
    artistCount: 42,
  }

  it('sets @context and @type correctly', () => {
    const result = generateStyleCollectionJsonLd(style)
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('CollectionPage')
  })

  it('builds the name with style name and InkHunt suffix', () => {
    const result = generateStyleCollectionJsonLd(style)
    expect(result.name).toBe('極簡線條刺青推薦 | InkHunt')
  })

  it('includes the style name in the description', () => {
    const result = generateStyleCollectionJsonLd(style)
    expect(result.description).toBe('精選台灣極簡線條風格刺青師，查看作品集和價格。')
  })

  it('builds url using default base URL and slug', () => {
    const result = generateStyleCollectionJsonLd(style)
    expect(result.url).toBe('https://inkhunt.tw/styles/fine-line')
  })

  it('sets numberOfItems from artistCount', () => {
    const result = generateStyleCollectionJsonLd(style)
    expect(result.numberOfItems).toBe(42)
  })

  it('handles zero artist count', () => {
    const result = generateStyleCollectionJsonLd({ ...style, artistCount: 0 })
    expect(result.numberOfItems).toBe(0)
  })

  it('respects NEXT_PUBLIC_BASE_URL env var for style URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.inkhunt.tw')
    const { generateStyleCollectionJsonLd: gen } = await import('@/lib/seo')
    const result = gen(style)
    expect(result.url).toBe('https://staging.inkhunt.tw/styles/fine-line')
  })
})

// ---------------------------------------------------------------------------
// generateWebsiteJsonLd
// ---------------------------------------------------------------------------

describe('generateWebsiteJsonLd', () => {
  it('sets @context and @type correctly', () => {
    const result = generateWebsiteJsonLd()
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('WebSite')
  })

  it('returns name InkHunt', () => {
    const result = generateWebsiteJsonLd()
    expect(result.name).toBe('InkHunt')
  })

  it('returns the correct alternateName', () => {
    const result = generateWebsiteJsonLd()
    expect(result.alternateName).toBe('找到你的刺青師')
  })

  it('uses default base URL when NEXT_PUBLIC_BASE_URL is not set', () => {
    const result = generateWebsiteJsonLd()
    expect(result.url).toBe('https://inkhunt.tw')
  })

  it('returns the correct description', () => {
    const result = generateWebsiteJsonLd()
    expect(result.description).toBe(
      '台灣第一個刺青師媒合平台。按風格篩選、瀏覽作品集、價格透明、一鍵詢價。',
    )
  })

  it('sets inLanguage to zh-TW', () => {
    const result = generateWebsiteJsonLd()
    expect(result.inLanguage).toBe('zh-TW')
  })

  it('respects NEXT_PUBLIC_BASE_URL env var', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://staging.inkhunt.tw')
    const { generateWebsiteJsonLd: gen } = await import('@/lib/seo')
    const result = gen()
    expect(result.url).toBe('https://staging.inkhunt.tw')
  })
})
