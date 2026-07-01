import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * Slice A (HAR-511): the asker-side per-row status pill (Slice B) and next-step
 * expectation copy (Slice C) render from the `inquiry.status` / `inquiry.nextStep`
 * namespaces. This test is the contract for those keys — it proves every
 * `InquiryStatus` value ('pending' | 'quoted' | 'accepted' | 'closed', per
 * src/lib/supabase/queries/inquiries.ts) resolves to real, non-empty copy in
 * BOTH shipped locale catalogs, so B/C never hardcode strings or hit a
 * missing-locale gap.
 */
const STATUS_KEYS = ['pending', 'quoted', 'accepted', 'closed'] as const

describe('inquiry.status + inquiry.nextStep i18n keys (HAR-511)', () => {
  for (const [name, catalog] of [
    ['en', en],
    ['zh-TW', zhTW],
  ] as const) {
    it(`exposes a status-pill label per InquiryStatus in the ${name} catalog`, () => {
      const status = (catalog.inquiry as Record<string, unknown>).status as
        | Record<string, unknown>
        | undefined
      expect(status, `${name}.inquiry.status`).toBeTruthy()
      for (const key of STATUS_KEYS) {
        expect(status?.[key], `${name}.inquiry.status.${key}`).toBeTruthy()
        expect(typeof status?.[key], `${name}.inquiry.status.${key}`).toBe('string')
      }
    })

    it(`has exactly the 4 status keys in the ${name} catalog`, () => {
      const status = (catalog.inquiry as Record<string, unknown>).status as Record<
        string,
        unknown
      >
      expect(Object.keys(status).sort()).toEqual([...STATUS_KEYS].sort())
    })

    it(`exposes a next-step expectation copy per InquiryStatus in the ${name} catalog`, () => {
      const nextStep = (catalog.inquiry as Record<string, unknown>).nextStep as
        | Record<string, unknown>
        | undefined
      expect(nextStep, `${name}.inquiry.nextStep`).toBeTruthy()
      for (const key of STATUS_KEYS) {
        expect(nextStep?.[key], `${name}.inquiry.nextStep.${key}`).toBeTruthy()
        expect(typeof nextStep?.[key], `${name}.inquiry.nextStep.${key}`).toBe('string')
      }
    })

    it(`has exactly the 4 next-step keys in the ${name} catalog`, () => {
      const nextStep = (catalog.inquiry as Record<string, unknown>).nextStep as Record<
        string,
        unknown
      >
      expect(Object.keys(nextStep).sort()).toEqual([...STATUS_KEYS].sort())
    })
  }
})
