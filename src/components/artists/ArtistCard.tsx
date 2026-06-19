import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'
import { ArtistAvatar } from './ArtistAvatar'
import { StyleBadge } from './StyleBadge'
import { PriceRange } from './PriceRange'
import { ArtistCompareAction } from './ArtistCompareAction'
import { StarRating } from '@/components/shared/StarRating'
import { formatPrice } from '@/lib/utils'

interface ArtistCardProps {
  readonly artist: ArtistWithDetails
  readonly variant?: 'default' | 'compact'
}

const MAX_VISIBLE_STYLES = 3

/** Star size (px) for the compact rating summary shown on listing cards. */
const RATING_STAR_SIZE = 14

/**
 * Compact rating summary for the listing/browse surface (HAR-417): a small
 * read-only StarRating + the numeric average (1 decimal) + `(count)`. Renders
 * nothing when the artist has no reviews so unreviewed cards stay clean.
 */
function CardReviewSummary({
  summary,
}: {
  readonly summary: ArtistWithDetails['reviewSummary']
}) {
  if (!summary || summary.count === 0) return null

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <StarRating value={summary.average} size={RATING_STAR_SIZE} readOnly />
      <span className="font-medium tabular-nums text-foreground">
        {summary.average.toFixed(1)}
      </span>
      <span className="tabular-nums">({summary.count})</span>
    </div>
  )
}

/**
 * Service-type badges for the discovery card (HAR-447): renders a 遮蓋
 * (cover-up) badge when `offers_coverup` is true and a Flash 圖 badge when
 * `has_flash_designs` is true, so a consumer who filtered by service sees
 * on-card confirmation of why the artist matched. Renders nothing when neither
 * flag is set. `offers_custom_design` is deliberately excluded — it DEFAULTs
 * true and is near-universal / low-signal. Mirrors the existing `Badge`
 * styling; `t` is the resolved `artists` namespace translator.
 */
function ServiceBadges({
  artist,
  t,
}: {
  readonly artist: ArtistWithDetails
  readonly t: (key: string) => string
}) {
  if (!artist.offers_coverup && !artist.has_flash_designs) return null

  return (
    <>
      {artist.offers_coverup && (
        <Badge
          variant="secondary"
          className="rounded-sm bg-ink-accent-dim text-accent-foreground hover:bg-muted"
        >
          {t('badgeCoverup')}
        </Badge>
      )}
      {artist.has_flash_designs && (
        <Badge
          variant="secondary"
          className="rounded-sm bg-ink-accent-dim text-accent-foreground hover:bg-muted"
        >
          {t('badgeFlash')}
        </Badge>
      )}
    </>
  )
}

export async function ArtistCard({ artist, variant = 'default' }: ArtistCardProps) {
  if (variant === 'compact') {
    // Await the (async) compact card so the resolved tree is returned directly;
    // this keeps a single top-level `await ArtistCard(...)` enough to render the
    // whole card (incl. the review summary) — RSC awaits nested async children
    // anyway, so behavior is unchanged in production.
    return CompactCard({ artist })
  }

  const t = await getTranslations('artists')

  const visibleStyles = artist.styles.slice(0, MAX_VISIBLE_STYLES)
  const extraCount = artist.styles.length - MAX_VISIBLE_STYLES

  return (
    <div className="relative">
      <Link href={`/artists/${artist.slug}`} className="block">
        <Card className="border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <ArtistAvatar
                name={artist.display_name}
                avatarUrl={artist.avatar_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-medium text-foreground">
                    {artist.display_name}
                  </h3>
                  {artist.featured && (
                    <Badge className="shrink-0 rounded-sm bg-primary text-primary-foreground hover:bg-ink-accent-hover">
                      {t('recommended')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{artist.city}</p>
              </div>
            </div>

            <CardReviewSummary summary={artist.reviewSummary} />

            <div className="flex flex-wrap gap-1.5">
              {visibleStyles.map((style) => (
                <StyleBadge
                  key={style.id}
                  name={style.name}
                  icon={style.icon}
                />
              ))}
              {extraCount > 0 && (
                <Badge variant="secondary" className="rounded-sm bg-ink-accent-dim text-muted-foreground">
                  +{extraCount}
                </Badge>
              )}
              <ServiceBadges artist={artist} t={t} />
            </div>

            {artist.portfolio_items.length > 0 && (
              <div className="flex gap-1">
                {artist.portfolio_items.slice(0, 3).map((item) => (
                  <div key={item.id} className="relative aspect-square w-1/3 overflow-hidden">
                    <Image
                      src={item.thumbnail_url ?? item.image_url}
                      alt={item.description ?? `${artist.display_name} work`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 120px"
                    />
                  </div>
                ))}
              </div>
            )}

            <PriceRange min={artist.price_min} max={artist.price_max} />
          </CardContent>
        </Card>
      </Link>

      {/* Compare button sits outside the Link so clicks do not trigger navigation */}
      <div className="absolute bottom-3 right-3">
        <ArtistCompareAction
          artist={{
            id: artist.id,
            display_name: artist.display_name,
            slug: artist.slug,
            avatar_url: artist.avatar_url ?? null,
          }}
        />
      </div>
    </div>
  )
}

async function CompactCard({ artist }: { readonly artist: ArtistWithDetails }) {
  const t = await getTranslations('artists')

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
    >
      <div className="flex items-center gap-3">
        <ArtistAvatar
          name={artist.display_name}
          avatarUrl={artist.avatar_url}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {artist.display_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {artist.city}
            {artist.district ? ` ${artist.district}` : ''}
          </p>
        </div>
      </div>
      {artist.styles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {artist.styles.slice(0, MAX_VISIBLE_STYLES).map((s) => (
            <StyleBadge key={s.id} name={s.name} icon={s.icon} />
          ))}
        </div>
      )}
      {(artist.offers_coverup || artist.has_flash_designs) && (
        <div className="mt-2 flex flex-wrap gap-1">
          <ServiceBadges artist={artist} t={t} />
        </div>
      )}
      {artist.reviewSummary && artist.reviewSummary.count > 0 && (
        <div className="mt-2">
          <CardReviewSummary summary={artist.reviewSummary} />
        </div>
      )}
      {artist.price_min !== null && artist.price_min !== undefined && (
        <p className="mt-2 text-sm text-primary">
          {t('priceFrom', { price: formatPrice(artist.price_min) })}
        </p>
      )}
    </Link>
  )
}
