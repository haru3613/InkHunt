import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getArtists } from '@/lib/supabase/queries/artists'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { parseListingSearchParams, hasActiveListingFilters } from '@/lib/validations/listing'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { ArtistFilters } from '@/components/artists/ArtistFilters'
import { ActiveFilterChips } from '@/components/artists/ActiveFilterChips'
import { ArtistListingHeader } from '@/components/artists/ArtistListingHeader'

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
    sort?: string
    budget?: string
    service?: string
    q?: string
  }>
}

export default async function ArtistsPage({ params, searchParams }: ArtistsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('artists')
  const sp = await searchParams

  const { sort, budget, service, q } = parseListingSearchParams(sp)

  const filters = {
    style: sp.style ?? null,
    city: sp.city ?? null,
    page: sp.page ? (parseInt(sp.page, 10) || 1) : 1,
    sort,
    budget,
    service,
    q,
  }

  const [{ data: artists, total }, styles] = await Promise.all([
    getArtists(filters),
    getAllStyles(),
  ])

  const hasActiveFilters = hasActiveListingFilters({
    style: filters.style,
    city: filters.city,
    sort,
    budget,
    service,
    q,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display mb-1 text-2xl font-bold text-foreground">{t('title')}</h1>

      <ArtistFilters styles={styles} />

      <div className="mt-3">
        <ActiveFilterChips styles={styles} />
      </div>

      <div className="mt-4">
        <ArtistListingHeader total={total} hasActiveFilters={hasActiveFilters} />

        {total > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
