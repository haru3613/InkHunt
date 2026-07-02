import { describe, it, expect } from 'vitest'
import en from '../../../../messages/en.json'
import zhTW from '../../../../messages/zh-TW.json'

/**
 * Slice B (HAR-529): budget-range intake. The consumer surfaces (Slice C form,
 * Slice D artist display) render their labels from the `inquiry.budgetRange`
 * namespace via next-intl `useTranslations`. This test is the contract for those
 * keys — it proves the label/helper/notSpecified fields and all 6 canonical
 * option CODES resolve to real, non-empty copy in BOTH shipped locale catalogs,
 * with identical key sets (no missing-locale gap).
 *
 * Re-scoped from `inquiry.budget` to `inquiry.budgetRange`: `inquiry.budget`
 * already exists as a live STRING (the quote-request form calls tInquiry('budget')),
 * and turning it into an object would make next-intl throw at that call site.
 */
const TOP_KEYS = ['label', 'helper', 'notSpecified', 'options'] as const
const OPTION_CODES = ['under_3k', '3k_8k', '8k_20k', '20k_50k', 'over_50k', 'unsure'] as const

describe('inquiry.budgetRange i18n keys (HAR-529)', () => {
  for (const [name, catalog] of [
    ['en', en],
    ['zh-TW', zhTW],
  ] as const) {
    it(`exposes label/helper/notSpecified as non-empty strings in the ${name} catalog`, () => {
      const budgetRange = catalog.inquiry.budgetRange as Record<string, unknown>
      for (const key of ['label', 'helper', 'notSpecified'] as const) {
        expect(budgetRange[key], `${name}.inquiry.budgetRange.${key}`).toBeTruthy()
        expect(typeof budgetRange[key], `${name}.inquiry.budgetRange.${key}`).toBe('string')
      }
    })

    it(`exposes all 6 canonical option codes as non-empty strings in the ${name} catalog`, () => {
      const options = (catalog.inquiry.budgetRange as { options: Record<string, unknown> }).options
      for (const code of OPTION_CODES) {
        expect(options[code], `${name}.inquiry.budgetRange.options.${code}`).toBeTruthy()
        expect(typeof options[code], `${name}.inquiry.budgetRange.options.${code}`).toBe('string')
      }
    })

    it(`has exactly the expected budgetRange + option key sets in the ${name} catalog`, () => {
      const budgetRange = catalog.inquiry.budgetRange as { options: Record<string, unknown> }
      expect(Object.keys(budgetRange).sort()).toEqual([...TOP_KEYS].sort())
      expect(Object.keys(budgetRange.options).sort()).toEqual([...OPTION_CODES].sort())
    })
  }

  it('leaves the existing inquiry.budget string key untouched (no object collision)', () => {
    expect(typeof en.inquiry.budget).toBe('string')
    expect(typeof zhTW.inquiry.budget).toBe('string')
  })
})
