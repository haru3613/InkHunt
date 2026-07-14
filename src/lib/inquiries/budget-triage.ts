import { BUDGET_RANGES } from '@/lib/validations/inquiry'
import type { Inquiry } from '@/types/database'

// HAR-711: sort real budget codes highest-first (over_50k -> under_3k); codes
// not in BUDGET_RANGES (i.e. 'unsure') and null/undefined budget_range both
// sort after every real code, tying with each other.
const UNSURE_INDEX = BUDGET_RANGES.indexOf('unsure') // last real slot, excluded from the "real code" span
const WORST_RANK = UNSURE_INDEX // 'unsure' and unknown/missing share this rank

const rankOf = (budgetRange: string | null | undefined): number => {
  const index = budgetRange ? (BUDGET_RANGES as readonly string[]).indexOf(budgetRange) : -1
  if (index === -1 || index === UNSURE_INDEX) return WORST_RANK
  // Invert index so the highest real budget (last-but-one in BUDGET_RANGES) ranks first.
  return UNSURE_INDEX - 1 - index
}

export function compareByBudgetDesc(a: Pick<Inquiry, 'budget_range'>, b: Pick<Inquiry, 'budget_range'>): number {
  return rankOf(a.budget_range) - rankOf(b.budget_range)
}
