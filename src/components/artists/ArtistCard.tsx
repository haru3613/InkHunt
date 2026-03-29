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
import { formatPrice } from '@/lib/utils'

interface ArtistCardProps {
  readonly artist: ArtistWithDetails
  readonly variant?: 'default' | 'compact'
}

const MAX_VISIBLE_STYLES = 3

export async function ArtistCard({ artist, variant = 'default' }: ArtistCardProps) {
  if (variant === 'compact') {
    return <CompactCard artist={artist} />
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
      {artist.price_min !== null && artist.price_min !== undefined && (
        <p className="mt-2 text-sm text-primary">
          {t('priceFrom', { price: formatPrice(artist.price_min) })}
        </p>
      )}
    </Link>
  )
}
