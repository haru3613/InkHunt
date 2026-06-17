import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * The /artists keyword-search box (HAR-456) renders its placeholder from the
 * `artists.searchPlaceholder` message key. The component test mocks
 * `useTranslations` to echo the key, so this test is the one that proves the
 * key actually RESOLVES to real copy in BOTH shipped locale catalogs.
 */
describe('artists.searchPlaceholder i18n key (HAR-456)', () => {
  it('exists and is non-empty in the en catalog', () => {
    expect(en.artists.searchPlaceholder).toBeTruthy()
    expect(typeof en.artists.searchPlaceholder).toBe('string')
  })

  it('exists and is non-empty in the zh-TW catalog', () => {
    expect(zhTW.artists.searchPlaceholder).toBeTruthy()
    expect(typeof zhTW.artists.searchPlaceholder).toBe('string')
  })
})
