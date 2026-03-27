import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getAllStyles, getStyleBySlug } from '@/lib/supabase/queries/styles'
import { getArtists, type ArtistWithDetails } from '@/lib/supabase/queries/artists'
import { generateStyleCollectionJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/shared/JsonLd'
import { formatPrice } from '@/lib/utils'

export async function generateStaticParams() {
  const styles = await getAllStyles()
  return styles.map((s) => ({ style: s.slug }))
}

interface StylePageProps {
  readonly params: Promise<{ style: string }>
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { style: slug } = await params
  const style = await getStyleBySlug(slug)
  if (!style) return {}

  return {
    title: `${style.name}刺青推薦`,
    description: `精選台灣${style.name}風格刺青師，查看作品集和價格。在 InkHunt 找到最適合你的${style.name}刺青師。`,
  }
}

function StyleArtistCard({ artist }: { readonly artist: ArtistWithDetails }) {
  const priceRange =
    artist.price_min !== null && artist.price_min !== undefined &&
    artist.price_max !== null && artist.price_max !== undefined
      ? `${formatPrice(artist.price_min)} ~ ${formatPrice(artist.price_max)}`
      : null

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="rounded-xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {artist.avatar_url && (
            <Image
              src={artist.avatar_url}
              alt={artist.display_name}
              fill
              className="object-cover"
              sizes="48px"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">{artist.display_name}</p>
          <p className="text-sm text-stone-500">
            {artist.city}
            {artist.district ? ` ${artist.district}` : ''}
          </p>
        </div>
      </div>
      {artist.styles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {artist.styles.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            >
              {s.icon} {s.name}
            </span>
          ))}
        </div>
      )}
      {priceRange && (
        <p className="mt-2 text-sm text-amber-600">{priceRange}</p>
      )}
    </Link>
  )
}

export default async function StylePage({ params }: StylePageProps) {
  const { style: slug } = await params
  const [style, { data: artists, total: artistCount }] = await Promise.all([
    getStyleBySlug(slug),
    getArtists({ style: slug }),
  ])

  if (!style) notFound()

  const jsonLd = generateStyleCollectionJsonLd({
    name: style.name,
    slug: style.slug,
    artistCount,
  })

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link
              href="/artists"
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              &larr; 所有刺青師
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-stone-900 lg:text-3xl">
              {style.icon} {style.name}刺青師推薦
            </h1>
            <p className="mt-1 text-stone-500">
              共 {artistCount} 位刺青師
            </p>
          </div>

          {artists.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((artist) => (
                <StyleArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          ) : (
            <p className="text-stone-400">
              目前沒有{style.name}風格的刺青師，敬請期待。
            </p>
          )}

          <div className="mt-8">
            <Link
              href={`/artists?style=${slug}`}
              className="text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              查看所有{style.name}刺青師 &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
