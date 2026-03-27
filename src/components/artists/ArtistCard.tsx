import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'
import { ArtistAvatar } from './ArtistAvatar'
import { StyleBadge } from './StyleBadge'
import { PriceRange } from './PriceRange'
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

          <PriceRange min={artist.price_min} max={artist.price_max} />
        </CardContent>
      </Card>
    </Link>
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
          {artist.styles.slice(0, 3).map((s) => (
            <span
              key={s.id}
              className="rounded-sm bg-ink-accent-dim px-2 py-0.5 text-xs text-muted-foreground"
            >
              {s.icon} {s.name}
            </span>
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
