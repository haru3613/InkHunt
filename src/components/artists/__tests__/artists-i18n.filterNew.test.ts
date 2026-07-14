import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * The /artists 只看新進刺青師 facet toggle + its active chip (HAR-585) render
 * their label from the `artists.filterNew` message key. The component/chip
 * tests mock `useTranslations` to echo the key, so this test is the one that
 * proves the key actually RESOLVES to real copy in BOTH shipped locale catalogs.
 */
const KEYS = ['filterNew'] as const

describe('artists filterNew i18n key (HAR-585)', () => {
  it.each(KEYS)('en.artists.%s exists and is a non-empty string', (key) => {
    const value = (en.artists as Record<string, unknown>)[key]
    expect(value).toBeTruthy()
    expect(typeof value).toBe('string')
  })

  it.each(KEYS)('zh-TW.artists.%s exists and is a non-empty string', (key) => {
    const value = (zhTW.artists as Record<string, unknown>)[key]
    expect(value).toBeTruthy()
    expect(typeof value).toBe('string')
  })
})
