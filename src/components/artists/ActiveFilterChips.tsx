'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import type { Style } from '@/types/database'

interface ActiveFilterChipsProps {
  styles: Style[]
}

/** URL param keys this row reflects (the full set ArtistFilters writes + search). */
const FILTER_KEYS = ['style', 'city', 'sort', 'budget', 'service', 'q'] as const

/**
 * Map a non-default option value to the existing `artists`-namespace i18n key
 * (HAR-433/434/446). `sort=featured`, `budget=any`, `service=all` are the
 * defaults ArtistFilters clears, so they never appear here.
 */
const SORT_LABEL_KEYS: Record<string, string> = {
  price_low: 'sortPriceLow',
  price_high: 'sortPriceHigh',
  newest: 'sortNewest',
}

const BUDGET_LABEL_KEYS: Record<string, string> = {
  le3000: 'budgetLe3000',
  le6000: 'budgetLe6000',
  le10000: 'budgetLe10000',
  gt10000: 'budgetGt10000',
}

const SERVICE_LABEL_KEYS: Record<string, string> = {
  coverup: 'serviceCoverup',
  flash: 'serviceFlash',
}

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
  if (sort && sort !== 'featured' && SORT_LABEL_KEYS[sort]) {
    chips.push({ key: 'sort', label: t(SORT_LABEL_KEYS[sort]) })
  }
  if (budget && budget !== 'any' && BUDGET_LABEL_KEYS[budget]) {
    chips.push({ key: 'budget', label: t(BUDGET_LABEL_KEYS[budget]) })
  }
  if (service && service !== 'all' && SERVICE_LABEL_KEYS[service]) {
    chips.push({ key: 'service', label: t(SERVICE_LABEL_KEYS[service]) })
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
