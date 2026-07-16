'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import type { Style } from '@/types/database'
import {
  BUDGET_LABEL_KEYS,
  MIN_RATING_LABEL_KEYS,
  SERVICE_LABEL_KEYS,
  SORT_LABEL_KEYS,
} from './filterLabels'

interface ActiveFilterChipsProps {
  styles: Style[]
}

/** URL param keys this row reflects (the full set ArtistFilters writes + search). */
const FILTER_KEYS = [
  'style',
  'city',
  'sort',
  'budget',
  'service',
  'minRating',
  'healed',
  'new',
  'q',
] as const

// Label-key maps are shared with ArtistFilters (HAR-757) — see filterLabels.ts.
// Widened to Record<string, string> because chips index them with raw URL
// params; an off-map value (e.g. minRating=3) yields no chip, matching the
// parsers' "no predicate for off-list input" contract.
const SORT_KEYS: Readonly<Record<string, string>> = SORT_LABEL_KEYS
const BUDGET_KEYS: Readonly<Record<string, string>> = BUDGET_LABEL_KEYS
const SERVICE_KEYS: Readonly<Record<string, string>> = SERVICE_LABEL_KEYS
const MIN_RATING_KEYS: Readonly<Record<string, string>> = MIN_RATING_LABEL_KEYS

interface ActiveChip {
  key: (typeof FILTER_KEYS)[number]
  /** Resolved, human-readable label for the chip. */
  label: string
}

export function ActiveFilterChips({ styles }: ActiveFilterChipsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('artists')

  const removeParams = useCallback(
    (keys: readonly string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const key of keys) params.delete(key)
      // Mirror ArtistFilters.updateParams: pagination resets on any filter change.
      params.delete('page')
      const qs = params.toString()
      router.push(qs ? `/artists?${qs}` : '/artists')
    },
    [router, searchParams],
  )

  const style = searchParams.get('style')
  const city = searchParams.get('city')
  const sort = searchParams.get('sort')
  const budget = searchParams.get('budget')
  const service = searchParams.get('service')
  const minRating = searchParams.get('minRating')
  const healed = searchParams.get('healed')
  const isNew = searchParams.get('new')
  const q = searchParams.get('q')?.trim()

  const chips: ActiveChip[] = []

  if (q) {
    chips.push({ key: 'q', label: t('searchChipLabel', { q }) })
  }
  if (style) {
    const matched = styles.find((s) => s.slug === style)
    chips.push({ key: 'style', label: matched?.name ?? style })
  }
  if (city) {
    chips.push({ key: 'city', label: city })
  }
  if (sort && sort !== 'featured' && SORT_KEYS[sort]) {
    chips.push({ key: 'sort', label: t(SORT_KEYS[sort]) })
  }
  if (budget && budget !== 'any' && BUDGET_KEYS[budget]) {
    chips.push({ key: 'budget', label: t(BUDGET_KEYS[budget]) })
  }
  if (service && service !== 'all' && SERVICE_KEYS[service]) {
    chips.push({ key: 'service', label: t(SERVICE_KEYS[service]) })
  }
  if (minRating && MIN_RATING_KEYS[minRating]) {
    chips.push({ key: 'minRating', label: t(MIN_RATING_KEYS[minRating]) })
  }
  // Boolean facet: only the literal '1' is active (mirrors parseHealed).
  if (healed === '1') {
    chips.push({ key: 'healed', label: t('filterHealed') })
  }
  // Boolean facet: only the literal '1' is active (mirrors parseNew, HAR-585).
  if (isNew === '1') {
    chips.push({ key: 'new', label: t('filterNew') })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t('activeFiltersLabel')}>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          data-slot="filter-chip"
          data-testid="filter-chip"
          className="gap-1 pr-1"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => removeParams([chip.key])}
            aria-label={`${t('removeFilter')}: ${chip.label}`}
            className="-mr-0.5 inline-flex size-3.5 items-center justify-center rounded-full hover:bg-foreground/10"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={() => removeParams(FILTER_KEYS)}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t('clearAll')}
      </button>
    </div>
  )
}
