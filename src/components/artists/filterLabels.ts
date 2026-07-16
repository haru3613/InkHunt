import {
  ALLOWED_MIN_RATINGS,
  ARTIST_BUDGETS,
  ARTIST_SERVICES,
  ARTIST_SORTS,
} from '@/lib/validations/listing'

/**
 * i18n label keys (`artists` namespace) for every non-default listing-filter
 * value. Shared by ArtistFilters (select options) and ActiveFilterChips
 * (chip labels) so the two can't drift.
 *
 * `satisfies` ties each map to the listing.ts allowlist: adding a value to
 * the parser without giving it a label fails compilation here. Defaults
 * (`featured` / `any` / `all`) never render as chips, so they are prepended
 * only in ArtistFilters' option lists. Key order = select display order.
 */
export const SORT_LABEL_KEYS = {
  rating: 'sortRating',
  price_low: 'sortPriceLow',
  price_high: 'sortPriceHigh',
  newest: 'sortNewest',
} as const satisfies Record<
  Exclude<(typeof ARTIST_SORTS)[number], 'featured'>,
  string
>

export const BUDGET_LABEL_KEYS = {
  le3000: 'budgetLe3000',
  le6000: 'budgetLe6000',
  le10000: 'budgetLe10000',
  gt10000: 'budgetGt10000',
} as const satisfies Record<
  Exclude<(typeof ARTIST_BUDGETS)[number], 'any'>,
  string
>

export const SERVICE_LABEL_KEYS = {
  coverup: 'serviceCoverup',
  flash: 'serviceFlash',
} as const satisfies Record<(typeof ARTIST_SERVICES)[number], string>

/** Keyed by the raw URL-param string (`'4'` / `'4.5'`), mirroring parseMinRating. */
export const MIN_RATING_LABEL_KEYS = {
  '4': 'rating4Plus',
  '4.5': 'rating45Plus',
} as const satisfies Record<`${(typeof ALLOWED_MIN_RATINGS)[number]}`, string>
