import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * The "成為刺青師" apply CTA (HAR-542) renders its label from the
 * `nav.becomeArtist` message key in Header + Footer. Those component tests mock
 * `useTranslations`/`getTranslations` to echo the key, so this test is the one
 * that proves the key actually RESOLVES to real copy in BOTH shipped locales.
 */
describe('nav.becomeArtist i18n key (HAR-542)', () => {
  it('exists and is non-empty in the zh-TW catalog', () => {
    expect(zhTW.nav.becomeArtist).toBeTruthy()
    expect(typeof zhTW.nav.becomeArtist).toBe('string')
  })

  it('exists and is non-empty in the en catalog', () => {
    expect(en.nav.becomeArtist).toBeTruthy()
    expect(typeof en.nav.becomeArtist).toBe('string')
  })
})
