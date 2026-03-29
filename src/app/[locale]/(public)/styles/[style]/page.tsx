import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAllStyles, getStyleBySlug } from '@/lib/supabase/queries/styles'

const getCachedStyle = cache(getStyleBySlug)
import { getArtists } from '@/lib/supabase/queries/artists'
import { generateStyleCollectionJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/shared/JsonLd'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { Link } from '@/i18n/navigation'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ink-hunt.com'

export async function generateStaticParams() {
  const styles = await getAllStyles()
  return styles.map((s) => ({ style: s.slug }))
}

interface StylePageProps {
  readonly params: Promise<{ locale: string; style: string }>
}

export async function generateMetadata({ params }: StylePageProps): Promise<Metadata> {
  const { locale, style: slug } = await params
  const t = await getTranslations({ locale, namespace: 'style' })
  const style = await getCachedStyle(slug)
  if (!style) return {}

  const description = `${style.name}刺青推薦｜瀏覽台灣${style.name}風格刺青師作品集，價格透明，一鍵詢價。`

  return {
    title: t('recommendTitle', { styleName: style.name }),
    description,
    openGraph: {
      title: t('recommendTitle', { styleName: style.name }),
      description,
    },
    twitter: {
      card: 'summary',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/styles/${slug}`,
      languages: {
        'zh-TW': `${baseUrl}/zh-TW/styles/${slug}`,
        'en': `${baseUrl}/en/styles/${slug}`,
      },
    },
  }
}

export default async function StylePage({ params }: StylePageProps) {
  const { locale, style: slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations('style')

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
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              &larr; {t('allArtists')}
            </Link>
            <h1 className="font-display mt-2 text-2xl font-bold text-foreground lg:text-3xl">
              {t('recommendTitle', { styleName: style.name })}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {t('totalArtists', { count: artistCount })}
            </p>
          </div>

          {artists.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} variant="compact" />
              ))}
            </div>
          ) : (
            <p className="text-ink-text-muted">
              {t('noArtists', { styleName: style.name })}
            </p>
          )}

          <div className="mt-8">
            <Link
              href={`/artists?style=${slug}`}
              className="text-sm font-medium text-primary hover:text-ink-accent-hover"
            >
              {t('viewAll', { styleName: style.name })} &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
