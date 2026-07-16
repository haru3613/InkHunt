'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import type { Style } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { StyleBadge } from './StyleBadge'
import {
  BUDGET_LABEL_KEYS,
  MIN_RATING_LABEL_KEYS,
  SERVICE_LABEL_KEYS,
  SORT_LABEL_KEYS,
} from './filterLabels'

/** Debounce window (ms) for the keyword-search box (HAR-456). */
const SEARCH_DEBOUNCE_MS = 300

interface ArtistFiltersProps {
  styles: Style[]
}

interface FilterSelectProps {
  items: ReadonlyArray<{ value: string; label: string }>
  defaultValue: string
  onValueChange: (value: string | null) => void
  /** Doubles as the trigger's aria-label and the (never-visible) placeholder. */
  label: string
}

/** One listing-filter dropdown — all five share this exact shape (HAR-757). */
function FilterSelect({
  items,
  defaultValue,
  onValueChange,
  label,
}: FilterSelectProps) {
  return (
    <Select items={items} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className="w-auto min-w-[120px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map(({ value, label: itemLabel }) => (
          <SelectItem key={value} value={value}>
            {itemLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const CITY_KEYS = [
  { key: 'cityTaipei', value: '台北市' },
  { key: 'cityNewTaipei', value: '新北市' },
  { key: 'cityTaoyuan', value: '桃園市' },
  { key: 'cityTaichung', value: '台中市' },
  { key: 'cityKaohsiung', value: '高雄市' },
  { key: 'cityTainan', value: '台南市' },
  { key: 'cityPingtung', value: '屏東縣' },
] as const

export function ArtistFilters({ styles }: ArtistFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('artists')

  // HAR-757: option values come from the shared label maps (which the
  // listing.ts allowlists type-check), with each select's clear/default
  // option prepended. The arrays feed both the Base UI Root's `items` (so
  // the closed trigger renders the LABEL, not the raw value) and the
  // <SelectItem> list.
  const labeled = (keys: Record<string, string>) =>
    Object.entries(keys).map(([value, key]) => ({ value, label: t(key) }))

  const cityItems = [
    { value: 'all', label: t('allRegions') },
    ...CITY_KEYS.map(({ key, value }) => ({ value, label: t(key) })),
  ]
  const sortItems = [
    { value: 'featured', label: t('sortFeatured') },
    ...labeled(SORT_LABEL_KEYS),
  ]
  const budgetItems = [
    { value: 'any', label: t('budgetAny') },
    ...labeled(BUDGET_LABEL_KEYS),
  ]
  const serviceItems = [
    { value: 'all', label: t('serviceAll') },
    ...labeled(SERVICE_LABEL_KEYS),
  ]
  const ratingItems = [
    { value: 'all', label: t('ratingAll') },
    ...labeled(MIN_RATING_LABEL_KEYS),
  ]

  const activeStyle = searchParams.get('style')
  const activeCity = searchParams.get('city')
  const activeSort = searchParams.get('sort')
  const activeBudget = searchParams.get('budget')
  const activeService = searchParams.get('service')
  const activeMinRating = searchParams.get('minRating')
  const activeQuery = searchParams.get('q')
  // HAR-481: healed-work facet is boolean — `?healed=1` is the only on-value
  // (matches `parseHealed`, HAR-479); absence means off.
  const activeHealed = searchParams.get('healed') === '1'
  // HAR-585: new-artist freshness facet is boolean — `?new=1` is the only
  // on-value (matches `parseNew`); absence means off.
  const activeNew = searchParams.get('new') === '1'

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/artists?${params.toString()}`)
    },
    [router, searchParams],
  )

  // Keyword search (HAR-456). Controlled box seeded from `?q=`; debounced so a
  // burst of keystrokes only writes the URL once. The box is the user-visible
  // consumer of HAR-455's `?q=` backend parsing.
  const [query, setQuery] = useState(activeQuery ?? '')
  // Skip the debounce push on the initial mount — the seeded value reflects the
  // URL already, so writing it back would be a redundant (and looping) push.
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const handle = setTimeout(() => {
      const trimmed = query.trim()
      // An empty (or whitespace-only) box clears the param; reuse updateParams
      // so `page` is dropped on change like every other filter.
      updateParams('q', trimmed || null)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query, updateParams])

  const handleStyleClick = useCallback(
    (slug: string | null) => {
      updateParams('style', slug === activeStyle ? null : slug)
    },
    [activeStyle, updateParams],
  )

  const handleCityChange = useCallback(
    (value: string | null) => {
      updateParams('city', !value || value === 'all' ? null : value)
    },
    [updateParams],
  )

  const handleSortChange = useCallback(
    (value: string | null) => {
      // `featured` is the default order — clear the param instead of writing it.
      updateParams('sort', !value || value === 'featured' ? null : value)
    },
    [updateParams],
  )

  const handleBudgetChange = useCallback(
    (value: string | null) => {
      // `any` is the default (no price predicate) — clear the param (HAR-434).
      updateParams('budget', !value || value === 'any' ? null : value)
    },
    [updateParams],
  )

  const handleServiceChange = useCallback(
    (value: string | null) => {
      // `all` is the clear option (no service predicate) — drop the param (HAR-446).
      updateParams('service', !value || value === 'all' ? null : value)
    },
    [updateParams],
  )

  const handleMinRatingChange = useCallback(
    (value: string | null) => {
      // `all` is the clear option (no rating predicate) — drop the param. Only
      // the `4` / `4.5` allowlist is offered (HAR-474/477); `parseMinRating`
      // rejects anything else on the page side regardless.
      updateParams('minRating', !value || value === 'all' ? null : value)
    },
    [updateParams],
  )

  const handleHealedToggle = useCallback(() => {
    // Boolean facet (HAR-481): on → `healed=1`, off → drop the param entirely
    // (mirrors `service=all` → param dropped). Toggle off the current state.
    updateParams('healed', activeHealed ? null : '1')
  }, [activeHealed, updateParams])

  const handleNewToggle = useCallback(() => {
    // Boolean facet (HAR-585): on → `new=1`, off → drop the param entirely.
    // Mirrors the healed toggle.
    updateParams('new', activeNew ? null : '1')
  }, [activeNew, updateParams])

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="w-full sm:max-w-xs"
      />

      <div className="flex gap-3">
        <FilterSelect
          items={cityItems}
          defaultValue={activeCity ?? 'all'}
          onValueChange={handleCityChange}
          label={t('selectRegion')}
        />
        <FilterSelect
          items={sortItems}
          defaultValue={activeSort ?? 'featured'}
          onValueChange={handleSortChange}
          label={t('sortLabel')}
        />
        <FilterSelect
          items={budgetItems}
          defaultValue={activeBudget ?? 'any'}
          onValueChange={handleBudgetChange}
          label={t('budgetLabel')}
        />
        <FilterSelect
          items={serviceItems}
          defaultValue={activeService ?? 'all'}
          onValueChange={handleServiceChange}
          label={t('serviceLabel')}
        />
        <FilterSelect
          items={ratingItems}
          defaultValue={activeMinRating ?? 'all'}
          onValueChange={handleMinRatingChange}
          label={t('ratingLabel')}
        />

        {/* HAR-481: boolean healed-work facet — a toggle, not a Select. */}
        <button
          type="button"
          onClick={handleHealedToggle}
          aria-pressed={activeHealed}
          className={`inline-flex h-9 w-auto min-w-[120px] items-center justify-center rounded-md border px-3 text-sm whitespace-nowrap transition-colors ${
            activeHealed
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background text-foreground hover:bg-accent'
          }`}
        >
          {t('filterHealed')}
        </button>

        {/* HAR-585: boolean new-artist freshness facet — a toggle, mirrors healed. */}
        <button
          type="button"
          onClick={handleNewToggle}
          aria-pressed={activeNew}
          className={`inline-flex h-9 w-auto min-w-[120px] items-center justify-center rounded-md border px-3 text-sm whitespace-nowrap transition-colors ${
            activeNew
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background text-foreground hover:bg-accent'
          }`}
        >
          {t('filterNew')}
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
        <button
          type="button"
          onClick={() => handleStyleClick(null)}
          className="shrink-0"
        >
          <StyleBadge name={t('allStyles')} active={activeStyle === null} />
        </button>
        {styles.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => handleStyleClick(style.slug)}
            className="shrink-0"
          >
            <StyleBadge
              name={style.name}
              icon={style.icon}
              active={activeStyle === style.slug}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
