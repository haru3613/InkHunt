import { describe, expect, it } from 'vitest'

import { compareByBudgetDesc } from '../budget-triage'

describe('compareByBudgetDesc', () => {
  it('sorts over_50k before 20k_50k', () => {
    expect(compareByBudgetDesc({ budget_range: 'over_50k' }, { budget_range: '20k_50k' })).toBeLessThan(0)
  })

  it('sorts 20k_50k before 8k_20k', () => {
    expect(compareByBudgetDesc({ budget_range: '20k_50k' }, { budget_range: '8k_20k' })).toBeLessThan(0)
  })

  it('sorts 8k_20k before 3k_8k', () => {
    expect(compareByBudgetDesc({ budget_range: '8k_20k' }, { budget_range: '3k_8k' })).toBeLessThan(0)
  })

  it('sorts 3k_8k before under_3k', () => {
    expect(compareByBudgetDesc({ budget_range: '3k_8k' }, { budget_range: 'under_3k' })).toBeLessThan(0)
  })

  it('sorts unsure after every real code', () => {
    expect(compareByBudgetDesc({ budget_range: 'unsure' }, { budget_range: 'under_3k' })).toBeGreaterThan(0)
    expect(compareByBudgetDesc({ budget_range: 'over_50k' }, { budget_range: 'unsure' })).toBeLessThan(0)
  })

  it('sorts null/undefined after every real code, same tier as unsure', () => {
    expect(compareByBudgetDesc({ budget_range: null }, { budget_range: 'under_3k' })).toBeGreaterThan(0)
    expect(compareByBudgetDesc({ budget_range: undefined }, { budget_range: 'under_3k' })).toBeGreaterThan(0)
    expect(compareByBudgetDesc({ budget_range: null }, { budget_range: 'unsure' })).toBe(0)
    expect(compareByBudgetDesc({ budget_range: undefined }, { budget_range: null })).toBe(0)
  })

  it('never throws and does not mutate the input array on a mixed/duplicate set', () => {
    const items = [
      { budget_range: 'unsure' },
      { budget_range: 'over_50k' },
      { budget_range: null },
      { budget_range: 'under_3k' },
      { budget_range: 'over_50k' },
      { budget_range: undefined },
      { budget_range: '3k_8k' },
    ]
    const original = [...items]
    const sorted = [...items].sort(compareByBudgetDesc)

    expect(items).toEqual(original) // caller's array untouched by comparator usage pattern
    expect(sorted.map((i) => i.budget_range)).toEqual([
      'over_50k',
      'over_50k',
      '3k_8k',
      'under_3k',
      'unsure',
      null,
      undefined,
    ])
  })
})
