import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

// Style images: local files (hand-picked) or Unsplash fallback.
// Local: public/styles/{slug}.avif — hand-picked by Harvey.
// Unsplash: free commercial use, for styles without a local image yet.
// TODO: Replace all with real artist portfolio samples when artists onboard.
// Matches the 21 styles from migration 004_update_styles_and_artists.sql.
// Local .avif = hand-picked by Harvey. Unsplash = placeholder until replaced.
const STYLE_IMAGES: Record<string, string> = {
  'fine-line':
    'https://images.unsplash.com/photo-1547754145-ef9ff306e3f3?w=600&q=80',
  micro:
    'https://images.unsplash.com/photo-1709897237651-1c624b3b428d?w=600&q=80',
  realism:
    'https://images.unsplash.com/photo-1575492899586-009d962fc732?w=600&q=80',
  floral:
    '/styles/floral.avif',
  blackwork:
    'https://images.unsplash.com/photo-1557130641-1b14718f096a?w=600&q=80',
  lettering:
    '/styles/lettering.avif',
  illustrative:
    '/styles/illustrative.avif',
  anime:
    'https://images.unsplash.com/photo-1647929369462-3258f892eb70?w=600&q=80',
  watercolor:
    '/styles/watercolor.avif',
  'japanese-traditional':
    '/styles/japanese-traditional.avif',
  geometric:
    '/styles/geometric.avif',
  'neo-traditional':
    '/styles/neo-traditional.avif',
  'american-traditional':
    'https://images.unsplash.com/photo-1641402027551-6a2fbf05b356?w=600&q=80',
  dotwork:
    'https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=600&q=80',
  portrait:
    'https://images.unsplash.com/photo-1640202430303-a71359ade259?w=600&q=80',
  ornamental:
    'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600&q=80',
  handpoke:
    'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=600&q=80',
  tribal:
    'https://images.unsplash.com/photo-1595246344716-5c9b563f11fe?w=600&q=80',
  surrealism:
    'https://images.unsplash.com/photo-1604093882750-3ed498f3178b?w=600&q=80',
  abstract:
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
  other:
    'https://images.unsplash.com/photo-1557130641-1b14718f096a?w=600&q=80',
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1575492899586-009d962fc732?w=600&q=80'

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
