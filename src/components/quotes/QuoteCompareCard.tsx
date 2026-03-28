'use client'

import { Clock, MessageCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArtistAvatar } from '@/components/artists/ArtistAvatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Quote {
  readonly id: string
  readonly price: number
  readonly note: string | null
  readonly status: string
  readonly available_dates: string | null
}

interface QuoteCompareCardProps {
  readonly artistName: string
  readonly artistAvatar: string | null
  readonly artistCity: string | null
  readonly artistSlug: string
  readonly quote: Quote | null
  readonly inquiryId: string
  readonly onAccept: () => void
}

export function QuoteCompareCard({
  artistName,
  artistAvatar,
  artistCity,
  artistSlug,
  quote,
  inquiryId,
  onAccept,
}: QuoteCompareCardProps) {
  const t = useTranslations('compare')

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      {/* Artist info */}
      <div className="flex items-center gap-3">
        <ArtistAvatar name={artistName} avatarUrl={artistAvatar} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{artistName}</p>
          {artistCity && (
            <p className="text-sm text-muted-foreground">{artistCity}</p>
          )}
        </div>
      </div>

      {/* Quote content */}
      <div className="flex-1">
        {quote ? (
          <div className="space-y-2">
            <p className="font-display text-2xl font-bold text-primary">
              NT${quote.price.toLocaleString()}
            </p>
            {quote.note && (
              <p className="text-sm text-muted-foreground">{quote.note}</p>
            )}
            {quote.available_dates && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                <span>{quote.available_dates}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">{t('waiting')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {quote?.status === 'sent' && (
          <Button onClick={onAccept} className="w-full" size="sm">
            {t('accept')}
          </Button>
        )}
        <div className="flex gap-2">
          <Link
            href={`/inquiries/${inquiryId}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1')}
          >
            <MessageCircle className="size-3.5" />
            {t('chat')}
          </Link>
          <Link
            href={`/artists/${artistSlug}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}
          >
            {t('viewProfile')}
          </Link>
        </div>
      </div>
    </div>
  )
}
