'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CompareArtist } from '@/hooks/useCompareList'

interface CompareFloatingBarProps {
  readonly artists: CompareArtist[]
  readonly onRemove: (id: string) => void
  readonly onClear: () => void
}

export function CompareFloatingBar({ artists, onRemove, onClear }: CompareFloatingBarProps) {
  const t = useTranslations('compare')

  if (artists.length === 0) return null

  const artistIds = artists.map((a) => a.id).join(',')

  return (
    <div
      role="region"
      aria-label={t('selected', { count: artists.length })}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-xl"
    >
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4">
        <span className="shrink-0 text-sm font-medium text-foreground">
          {t('selected', { count: artists.length })}
        </span>

        <div className="flex flex-1 flex-wrap gap-2">
          {artists.map((artist) => (
            <span
              key={artist.id}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-sm text-foreground"
            >
              {artist.display_name}
              <button
                type="button"
                onClick={() => onRemove(artist.id)}
                aria-label={`${t('remove')} ${artist.display_name}`}
                className="ml-0.5 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            {t('clearAll')}
          </Button>

          <Link
            href={`/quote-requests/new?artists=${artistIds}`}
            className={cn(buttonVariants({ size: 'sm' }), 'bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            {t('continueToInquiry')} &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
