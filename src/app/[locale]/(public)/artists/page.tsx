import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getArtists } from '@/lib/supabase/queries/artists'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { ArtistFilters } from '@/components/artists/ArtistFilters'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ink-hunt.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('artistsTitle'),
    description: t('artistsDescription'),
    openGraph: {
      title: t('artistsTitle'),
      description: t('artistsDescription'),
    },
    twitter: {
      card: 'summary',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/artists`,
      languages: {
        'zh-TW': `${baseUrl}/zh-TW/artists`,
        'en': `${baseUrl}/en/artists`,
      },
    },
  }
}

interface ArtistsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    style?: string
    city?: string
    page?: string
  }>
}

export default async function ArtistsPage({ params, searchParams }: ArtistsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('artists')
  const sp = await searchParams

  const filters = {
    style: sp.style ?? null,
    city: sp.city ?? null,
    page: sp.page ? (parseInt(sp.page, 10) || 1) : 1,
  }

  const [{ data: artists, total }, styles] = await Promise.all([
    getArtists(filters),
    getAllStyles(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display mb-1 text-2xl font-bold text-foreground">{t('title')}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t('total', { count: total })}</p>

      <ArtistFilters styles={styles} />

      {artists.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted-foreground">
          {t('noResults')}
        </div>
      )}
    </div>
  )
}
