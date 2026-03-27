import Link from 'next/link'
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

export function ArtistCard({ artist, variant = 'default' }: ArtistCardProps) {
  if (variant === 'compact') {
    return <CompactCard artist={artist} />
  }

  const visibleStyles = artist.styles.slice(0, MAX_VISIBLE_STYLES)
  const extraCount = artist.styles.length - MAX_VISIBLE_STYLES

  return (
    <Link href={`/artists/${artist.slug}`} className="block">
      <Card className="border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <ArtistAvatar
              name={artist.display_name}
              avatarUrl={artist.avatar_url}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-medium text-stone-900">
                  {artist.display_name}
                </h3>
                {artist.featured && (
                  <Badge className="shrink-0 bg-amber-500 text-white hover:bg-amber-600">
                    推薦
                  </Badge>
                )}
              </div>
              <p className="text-sm text-stone-500">{artist.city}</p>
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
              <Badge variant="secondary" className="bg-stone-100 text-stone-500">
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

function CompactCard({ artist }: { readonly artist: ArtistWithDetails }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="rounded-xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <ArtistAvatar
          name={artist.display_name}
          avatarUrl={artist.avatar_url}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">
            {artist.display_name}
          </p>
          <p className="text-xs text-stone-500">
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
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            >
              {s.icon} {s.name}
            </span>
          ))}
        </div>
      )}
      {artist.price_min !== null && artist.price_min !== undefined && (
        <p className="mt-2 text-sm text-amber-600">
          {formatPrice(artist.price_min)} 起
        </p>
      )}
    </Link>
  )
}
