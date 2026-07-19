import { describe, expect, it } from 'vitest'
import { buildLocalizedAlternates } from '../metadata'

describe('buildLocalizedAlternates', () => {
  it('builds a locale-specific canonical with both hreflang variants', () => {
    expect(buildLocalizedAlternates('en', '/about')).toEqual({
      canonical: 'https://ink-hunt.com/en/about',
      languages: {
        'zh-TW': 'https://ink-hunt.com/zh-TW/about',
        en: 'https://ink-hunt.com/en/about',
      },
    })
  })

  it('normalizes the homepage path without a trailing slash', () => {
    expect(buildLocalizedAlternates('zh-TW', '').canonical).toBe(
      'https://ink-hunt.com/zh-TW',
    )
  })
})
