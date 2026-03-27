'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
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
import { StyleBadge } from './StyleBadge'

interface ArtistFiltersProps {
  styles: Style[]
}

const CITIES = [
  '台北市',
  '新北市',
  '桃園市',
  '台中市',
  '高雄市',
  '台南市',
  '屏東縣',
] as const

export function ArtistFilters({ styles }: ArtistFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('artists')

  const activeStyle = searchParams.get('style')
  const activeCity = searchParams.get('city')

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

  return (
    <div className="flex flex-col gap-3">
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
            {CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
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
