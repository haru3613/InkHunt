import type { Metadata } from 'next'
import { getArtists } from '@/lib/supabase/queries/artists'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { ArtistFilters } from '@/components/artists/ArtistFilters'

export const metadata: Metadata = {
  title: '找刺青師 | InkHunt',
  description: '按風格、地區篩選台灣刺青師，瀏覽作品集，一鍵詢價',
}

interface ArtistsPageProps {
  searchParams: Promise<{
    style?: string
    city?: string
    page?: string
  }>
}

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const params = await searchParams

  const filters = {
    style: params.style ?? null,
    city: params.city ?? null,
    page: params.page ? (parseInt(params.page, 10) || 1) : 1,
  }

  const [{ data: artists, total }, styles] = await Promise.all([
    getArtists(filters),
    getAllStyles(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">找刺青師</h1>
      <p className="mb-4 text-sm text-stone-500">共 {total} 位刺青師</p>

      <ArtistFilters styles={styles} />

      {artists.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center text-stone-500">
          沒有符合條件的刺青師
        </div>
      )}
    </div>
  )
}
