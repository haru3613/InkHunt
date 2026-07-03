import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * Slice C (HAR-508): consumer inquiry status-filter chips (Slice D) render their
 * labels + per-status empty copy from the `inquiry.filters` namespace. This test
 * is the contract for those keys — it proves all 10 resolve to real, non-empty
 * copy in BOTH shipped locale catalogs, so Slice D's component can rely on them.
 */
const FILTER_KEYS = [
  'all',
  'pending',
  'quoted',
  'accepted',
  'closed',
  'emptyAll',
  'emptyPending',
  'emptyQuoted',
  'emptyAccepted',
  'emptyClosed',
] as const

describe('inquiry.filters i18n keys (HAR-508)', () => {
  for (const [name, catalog] of [
    ['en', en],
    ['zh-TW', zhTW],
  ] as const) {
    it(`exposes all 10 filter keys as non-empty strings in the ${name} catalog`, () => {
      const filters = catalog.inquiry.filters as Record<string, unknown>
      for (const key of FILTER_KEYS) {
        expect(filters[key], `${name}.inquiry.filters.${key}`).toBeTruthy()
        expect(typeof filters[key], `${name}.inquiry.filters.${key}`).toBe('string')
      }
    })

    it(`has exactly the 10 expected filter keys in the ${name} catalog`, () => {
      const filters = catalog.inquiry.filters as Record<string, unknown>
      expect(Object.keys(filters).sort()).toEqual([...FILTER_KEYS].sort())
    })
  }
})
