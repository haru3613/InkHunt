import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { getCurrentUser } from '@/lib/auth/helpers'
import {
  parseDiscoveryQuery,
  listForViewer,
} from '@/lib/discovery'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { ArtistFilters } from '@/components/artists/ArtistFilters'
import { ActiveFilterChips } from '@/components/artists/ActiveFilterChips'
import { ArtistListingHeader } from '@/components/artists/ArtistListingHeader'
import { ArtistPagination } from '@/components/artists/ArtistPagination'
import { buildLocalizedAlternates } from '@/lib/metadata'

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
    alternates: buildLocalizedAlternates(locale, '/artists'),
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
    minRating?: string
    q?: string
    healed?: string
    new?: string
  }>
}

export default async function ArtistsPage({ params, searchParams }: ArtistsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('artists')
  const sp = await searchParams
  const query = parseDiscoveryQuery(sp)

  // Styles + session in parallel; listing needs viewer for heart decoration.
  const [styles, user] = await Promise.all([getAllStyles(), getCurrentUser()])
  const listing = await listForViewer(
    query,
    user ? { lineUserId: user.lineUserId } : null,
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display mb-1 text-2xl font-bold text-foreground">{t('title')}</h1>

      <ArtistFilters styles={styles} />

      <div className="mt-3">
        <ActiveFilterChips styles={styles} />
      </div>

      <div className="mt-4">
        <ArtistListingHeader
          total={listing.total}
          hasActiveFilters={listing.hasActiveFilters}
        />

        {listing.total > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listing.artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  initialFavorited={listing.favoritedIds.has(artist.id)}
                />
              ))}
            </div>

            <ArtistPagination
              page={listing.page}
              pageSize={listing.pageSize}
              total={listing.total}
              searchParams={sp}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
