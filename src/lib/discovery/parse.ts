import {
  parseListingSearchParams,
  hasActiveListingFilters,
} from '@/lib/validations/listing'
import { DEFAULT_PAGE_SIZE } from '@/lib/supabase/queries/artists'
import type { DiscoveryQuery } from '@/lib/discovery/types'

function firstString(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0]
  }
  return null
}

function parsePage(raw: string | string[] | undefined): number {
  const s = firstString(raw)
  if (!s) return 1
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/**
 * Pure: untrusted searchParams → DiscoveryQuery.
 * Reuses listing validation for sort/budget/service/q/rating/healed/new;
 * adds style/city/page that the page used to assemble by hand.
 */
export function parseDiscoveryQuery(
  searchParams: Record<string, string | string[] | undefined>,
): DiscoveryQuery {
  const partial = parseListingSearchParams(searchParams)
  return {
    style: firstString(searchParams.style),
    city: firstString(searchParams.city),
    page: parsePage(searchParams.page),
    pageSize: DEFAULT_PAGE_SIZE,
    sort: partial.sort,
    budget: partial.budget,
    service: partial.service,
    q: partial.q,
    minRating: partial.minRating,
    healed: partial.healed,
    isNew: partial.new,
  }
}

/** Pure active-filter signal for the clear-filters affordance. */
export function discoveryHasActiveFilters(query: DiscoveryQuery): boolean {
  return hasActiveListingFilters({
    style: query.style,
    city: query.city,
    sort: query.sort,
    budget: query.budget,
    service: query.service,
    q: query.q,
    minRating: query.minRating,
    healed: query.healed,
    new: query.isNew,
  })
}
