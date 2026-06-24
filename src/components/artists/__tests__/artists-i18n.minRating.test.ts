import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * The /artists 最低評分 control + its active chip (HAR-477) render their label,
 * the 全部 / 4★+ / 4.5★+ option labels, and the chip labels from these
 * `artists`-namespace message keys. The component/chip tests mock
 * `useTranslations` to echo the key, so this test is the one that proves the
 * keys actually RESOLVE to real copy in BOTH shipped locale catalogs.
 */
const KEYS = ['ratingLabel', 'ratingAll', 'rating4Plus', 'rating45Plus'] as const

describe('artists minRating i18n keys (HAR-477)', () => {
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
