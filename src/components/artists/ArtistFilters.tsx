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

/** Debounce window (ms) for the keyword-search box (HAR-456). */
const SEARCH_DEBOUNCE_MS = 300

interface ArtistFiltersProps {
  styles: Style[]
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

  const activeStyle = searchParams.get('style')
  const activeCity = searchParams.get('city')
  const activeSort = searchParams.get('sort')
  const activeBudget = searchParams.get('budget')
  const activeService = searchParams.get('service')
  const activeQuery = searchParams.get('q')

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
        <Select
          defaultValue={activeCity ?? 'all'}
          onValueChange={handleCityChange}
        >
          <SelectTrigger className="w-auto min-w-[120px]">
            <SelectValue placeholder={t('selectRegion')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRegions')}</SelectItem>
            {CITY_KEYS.map(({ key, value }) => (
              <SelectItem key={value} value={value}>
                {t(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          defaultValue={activeSort ?? 'featured'}
          onValueChange={handleSortChange}
        >
          <SelectTrigger aria-label={t('sortLabel')} className="w-auto min-w-[120px]">
            <SelectValue placeholder={t('sortLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">{t('sortFeatured')}</SelectItem>
            <SelectItem value="price_low">{t('sortPriceLow')}</SelectItem>
            <SelectItem value="price_high">{t('sortPriceHigh')}</SelectItem>
            <SelectItem value="newest">{t('sortNewest')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={activeBudget ?? 'any'}
          onValueChange={handleBudgetChange}
        >
          <SelectTrigger aria-label={t('budgetLabel')} className="w-auto min-w-[120px]">
            <SelectValue placeholder={t('budgetLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('budgetAny')}</SelectItem>
            <SelectItem value="le3000">{t('budgetLe3000')}</SelectItem>
            <SelectItem value="le6000">{t('budgetLe6000')}</SelectItem>
            <SelectItem value="le10000">{t('budgetLe10000')}</SelectItem>
            <SelectItem value="gt10000">{t('budgetGt10000')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue={activeService ?? 'all'}
          onValueChange={handleServiceChange}
        >
          <SelectTrigger aria-label={t('serviceLabel')} className="w-auto min-w-[120px]">
            <SelectValue placeholder={t('serviceLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('serviceAll')}</SelectItem>
            <SelectItem value="coverup">{t('serviceCoverup')}</SelectItem>
            <SelectItem value="flash">{t('serviceFlash')}</SelectItem>
          </SelectContent>
        </Select>
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
