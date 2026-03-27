import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

const STYLE_IMAGES: Record<string, string> = {
  realism:
    'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80',
  geometric:
    'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=600&q=80',
  'japanese-traditional':
    'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=600&q=80',
  'american-traditional':
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80',
  'neo-traditional':
    'https://images.unsplash.com/photo-1590246814883-57c511e76ad6?w=600&q=80',
  watercolor:
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80',
  'fine-line':
    'https://images.unsplash.com/photo-1590246814883-57c511e76ad6?w=600&q=80',
  blackwork:
    'https://images.unsplash.com/photo-1612459284270-27b3a394fee7?w=600&q=80',
  floral:
    'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=600&q=80',
  lettering:
    'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80',
  dotwork:
    'https://images.unsplash.com/photo-1612459284270-27b3a394fee7?w=600&q=80',
  tribal:
    'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=600&q=80',
  illustrative:
    'https://images.unsplash.com/photo-1590246814883-57c511e76ad6?w=600&q=80',
  anime:
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80',
  portrait:
    'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80',
  micro:
    'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=600&q=80',
  coverup:
    'https://images.unsplash.com/photo-1612459284270-27b3a394fee7?w=600&q=80',
  other:
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80',
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80'

interface StyleCardProps {
  readonly style: StyleRow
  readonly artistCount: number
  readonly artistsLabel: string
}

function StyleCard({ style, artistCount, artistsLabel }: StyleCardProps) {
  const imageUrl = STYLE_IMAGES[style.slug] ?? DEFAULT_IMAGE

  return (
    <Link
      href={`/styles/${style.slug}`}
      className="group relative block aspect-[4/3] overflow-hidden rounded-none"
    >
      <Image
        src={imageUrl}
        alt={style.name}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
        className="object-cover brightness-50 transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-[0.7]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4">
        <p className="font-display text-base font-semibold text-foreground">
          {style.name}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {artistCount} {artistsLabel}
        </p>
      </div>
    </Link>
  )
}

interface StyleGridProps {
  readonly styles: readonly StyleRow[]
  readonly artistCounts: ReadonlyMap<string, number>
}

export async function StyleGrid({ styles, artistCounts }: StyleGridProps) {
  const t = await getTranslations('common')

  return (
    <div className="grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-1">
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          artistCount={artistCounts.get(style.slug) ?? 0}
          artistsLabel={t('artists')}
        />
      ))}
    </div>
  )
}
