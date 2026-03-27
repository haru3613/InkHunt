import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'
import { StyleBadge } from './StyleBadge'
import { PriceRange } from './PriceRange'

interface ArtistCardProps {
  artist: ArtistWithDetails
}

const MAX_VISIBLE_STYLES = 3

export function ArtistCard({ artist }: ArtistCardProps) {
  const visibleStyles = artist.styles.slice(0, MAX_VISIBLE_STYLES)
  const extraCount = artist.styles.length - MAX_VISIBLE_STYLES

  return (
    <Link href={`/artists/${artist.slug}`} className="block">
      <Card className="border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-stone-100">
              {artist.avatar_url ? (
                <Image
                  src={artist.avatar_url}
                  alt={artist.display_name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-lg text-stone-400">
                  {artist.display_name.charAt(0)}
                </div>
              )}
            </div>
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
