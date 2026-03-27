import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllStyles, getStyleBySlug } from '@/lib/supabase/queries/styles'
import { getArtists } from '@/lib/supabase/queries/artists'
import { generateStyleCollectionJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/shared/JsonLd'
import { ArtistCard } from '@/components/artists/ArtistCard'

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
                <ArtistCard key={artist.id} artist={artist} variant="compact" />
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
