import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isAdmin,
  parseAdminLineUserIds,
  isAdminPath,
  isProtectedArtistPath,
  withLocalePrefix,
} from '../admin'

const LOCALES = ['zh-TW', 'en'] as const

describe('parseAdminLineUserIds / isAdmin', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('trims whitespace around comma-separated ids', () => {
    expect(parseAdminLineUserIds(' Ua , Ub ')).toEqual(['Ua', 'Ub'])
    expect(isAdmin('Ua', ' Ua , Ub ')).toBe(true)
    expect(isAdmin('Uc', ' Ua , Ub ')).toBe(false)
  })

  it('returns false for empty env or empty id', () => {
    expect(isAdmin('Ua', '')).toBe(false)
    expect(isAdmin('', 'Ua')).toBe(false)
  })
})

describe('isAdminPath', () => {
  it('matches bare and locale-prefixed admin paths including zh-TW', () => {
    expect(isAdminPath('/admin', LOCALES)).toBe(true)
    expect(isAdminPath('/admin/', LOCALES)).toBe(true)
    expect(isAdminPath('/en/admin', LOCALES)).toBe(true)
    expect(isAdminPath('/zh-TW/admin', LOCALES)).toBe(true)
    expect(isAdminPath('/zh-TW/admin/extra', LOCALES)).toBe(true)
  })

  it('does not match unrelated paths', () => {
    expect(isAdminPath('/zh-TW/artists', LOCALES)).toBe(false)
    expect(isAdminPath('/administrator', LOCALES)).toBe(false)
    expect(isAdminPath('/zh-TW/artist/dashboard', LOCALES)).toBe(false)
  })
})

describe('isProtectedArtistPath', () => {
  it('matches artist dashboard segments with zh-TW locale', () => {
    expect(isProtectedArtistPath('/artist/dashboard', LOCALES)).toBe(true)
    expect(isProtectedArtistPath('/zh-TW/artist/portfolio', LOCALES)).toBe(true)
    expect(isProtectedArtistPath('/en/artist/inquiries', LOCALES)).toBe(true)
    expect(isProtectedArtistPath('/zh-TW/artist/onboarding', LOCALES)).toBe(true)
  })

  it('does not match public artist entry', () => {
    expect(isProtectedArtistPath('/artist', LOCALES)).toBe(false)
    expect(isProtectedArtistPath('/zh-TW/artist', LOCALES)).toBe(false)
    expect(isProtectedArtistPath('/zh-TW/artists', LOCALES)).toBe(false)
  })
})

describe('withLocalePrefix', () => {
  it('keeps zh-TW prefix on redirects', () => {
    expect(withLocalePrefix('/zh-TW/admin', '/forbidden', LOCALES)).toBe(
      '/zh-TW/forbidden',
    )
    expect(withLocalePrefix('/en/admin', '/forbidden', LOCALES)).toBe(
      '/en/forbidden',
    )
    expect(withLocalePrefix('/admin', '/forbidden', LOCALES)).toBe('/forbidden')
  })
})
