'use client'
import { useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { CITIES, SUBJECTS } from '@/lib/discovery/catalog'
import type { Style } from '@/types/database'

export function ExploreFilters({ styles, en, home = false }: { styles: Style[]; en: boolean; home?: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(home ? '' : params.toString())
    if (value) next.set(key, value); else next.delete(key)
    next.delete('page')
    startTransition(() => router.push(`/explore?${next.toString()}`, { scroll: false }))
  }
  const subject = home ? '' : params.get('subject') || ''
  return <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between" aria-busy={pending}>
    <div className="flex gap-5 overflow-x-auto text-sm">
      {[{value:'',zh:'全部',en:'All'},...SUBJECTS].map(item => <button key={item.value} onClick={() => update('subject', item.value)} aria-pressed={subject === item.value} className={`min-h-11 shrink-0 border-b-2 px-1 ${subject === item.value ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground'}`}>{en ? item.en : item.zh}</button>)}
    </div>
    <div className="flex gap-3">
      <select aria-label={en ? 'Region' : '地區'} className="v2-select min-w-0 flex-1 lg:flex-none" value={home ? '' : params.get('city') || ''} onChange={e => update('city', e.target.value)}><option value="">{en ? 'All regions' : '所有地區'}</option>{CITIES.map(city => <option key={city}>{city}</option>)}</select>
      <select aria-label={en ? 'Style' : '風格'} className="v2-select min-w-0 flex-1 lg:flex-none" value={home ? '' : params.get('style') || ''} onChange={e => update('style', e.target.value)}><option value="">{en ? 'All styles' : '所有風格'}</option>{styles.map(style => <option key={style.slug} value={style.slug}>{en ? style.name_en || style.name : style.name}</option>)}</select>
    </div>
  </div>
}
