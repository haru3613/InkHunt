import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import type { Database } from '@/types/database'
import { selectStylesForDiscovery } from '@/components/artists/selectStylesForDiscovery'
import { hasPublicArtistCount } from '@/lib/public-supply'

export { selectStylesForDiscovery } from '@/components/artists/selectStylesForDiscovery'

type StyleRow = Database['public']['Tables']['styles']['Row']

// 21 styles matching migration 004. Local .avif (hand-picked) or Unsplash placeholder.
// TODO: Replace with real artist portfolio samples when artists onboard.
const STYLE_IMAGES: Record<string, string> = {
  'fine-line':
    'https://images.unsplash.com/photo-1547754145-ef9ff306e3f3?w=600&q=80',
  micro:
    'https://images.unsplash.com/photo-1709897237651-1c624b3b428d?w=600&q=80',
  realism:
    'https://images.unsplash.com/photo-1575492899586-009d962fc732?w=600&q=80',
  floral: '/styles/floral.avif',
  blackwork:
    'https://images.unsplash.com/photo-1557130641-1b14718f096a?w=600&q=80',
  lettering: '/styles/lettering.avif',
  illustrative: '/styles/illustrative.avif',
  anime:
    'https://images.unsplash.com/photo-1647929369462-3258f892eb70?w=600&q=80',
  watercolor: '/styles/watercolor.avif',
  'japanese-traditional': '/styles/japanese-traditional.avif',
  geometric: '/styles/geometric.avif',
  'neo-traditional': '/styles/neo-traditional.avif',
  'american-traditional':
    'https://images.unsplash.com/photo-1641402027551-6a2fbf05b356?w=600&q=80',
  dotwork: '/styles/dotwork.avif',
  portrait:
    'https://images.unsplash.com/photo-1640202430303-a71359ade259?w=600&q=80',
  ornamental: '/styles/ornamental.avif',
  handpoke:
    'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80',
  tribal:
    'https://images.unsplash.com/photo-1595246344716-5c9b563f11fe?w=600&q=80',
  surrealism: '/styles/surrealism.avif',
  abstract: '/styles/abstract.avif',
  other: '/styles/other.avif',
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1575492899586-009d962fc732?w=600&q=80'

interface StyleCardProps {
  readonly style: StyleRow
  readonly artistCount: number
  readonly artistsLabel: string
  readonly sampleImage?: string
}

function StyleCard({
  style,
  artistCount,
  artistsLabel,
  sampleImage,
}: StyleCardProps) {
  const imageUrl = sampleImage ?? STYLE_IMAGES[style.slug] ?? DEFAULT_IMAGE

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
        className="object-cover brightness-[0.72] transition-[transform,filter] duration-300 ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105 [@media(hover:hover)_and_(pointer:fine)]:group-hover:brightness-[0.82]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4">
        <p className="font-display text-base font-semibold text-foreground">
          {style.name}
        </p>
        {hasPublicArtistCount(artistCount) ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {artistCount} {artistsLabel}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

interface StyleGridProps {
  readonly styles: readonly StyleRow[]
  readonly artistCounts: ReadonlyMap<string, number>
  readonly sampleImages?: ReadonlyMap<string, string>
}

export async function StyleGrid({
  styles,
  artistCounts,
  sampleImages,
}: StyleGridProps) {
  const t = await getTranslations('common')
  const { styles: visible } = selectStylesForDiscovery(
    styles,
    artistCounts,
  )

  if (visible.length === 0) {
    return null
  }

  return (
    <div className="grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-1">
      {visible.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          artistCount={artistCounts.get(style.slug) ?? 0}
          artistsLabel={t('artists')}
          sampleImage={sampleImages?.get(style.slug)}
        />
      ))}
    </div>
  )
}
