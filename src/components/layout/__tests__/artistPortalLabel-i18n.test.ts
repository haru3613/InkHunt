import { describe, it, expect } from 'vitest'
import zhTW from '../../../../messages/zh-TW.json'
import en from '../../../../messages/en.json'

// HAR-757: the artist-portal entry (/artist) used three different names —
// 成為刺青師 (header/footer), 我是刺青師 (hero), 設計師 (mobile tab). 設計師 is
// the wrong term outright. zh-TW must use ONE name everywhere; en keeps a
// short tab variant ("For Artists") for tab-bar width but must not regress
// to the bare "Artist".
describe('artist-portal entry label consistency (HAR-757)', () => {
  it('uses 成為刺青師 for every zh-TW entry point', () => {
    expect(zhTW.nav.becomeArtist).toBe('成為刺青師')
    expect(zhTW.nav.artist).toBe('成為刺青師')
    expect(zhTW.home.iAmArtist).toBe('成為刺青師')
  })

  it('never uses 設計師 anywhere in the zh-TW nav catalog', () => {
    for (const value of Object.values(zhTW.nav)) {
      expect(value).not.toContain('設計師')
    }
  })

  it('uses artist-correct en labels (tab may be the short variant)', () => {
    expect(en.nav.becomeArtist).toBe('Become an Artist')
    expect(en.nav.artist).toBe('For Artists')
    expect(en.home.iAmArtist).toBe('Become an Artist')
  })
})
