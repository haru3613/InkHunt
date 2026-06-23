import { createAdminClient } from '@/lib/supabase/server'
import {
  ARTIST_PUBLIC_SELECT,
  transformArtistRow,
  type ArtistWithDetails,
} from './artists'

type SupabaseArtistRow = Parameters<typeof transformArtistRow>[0]

/**
 * Add a favorite for a consumer. Idempotent: a double-tap upserts on the
 * (consumer_line_id, artist_id) PK rather than erroring on conflict.
 */
export async function addFavorite(
  consumerLineId: string,
  artistId: string,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('favorites')
    .upsert(
      { consumer_line_id: consumerLineId, artist_id: artistId },
      { onConflict: 'consumer_line_id,artist_id', ignoreDuplicates: true },
    )

  if (error) throw new Error(`Failed to add favorite: ${error.message}`)
}

/**
 * Remove a single favorite, scoped to BOTH the consumer and the artist.
 * Never a bulk delete — both keys are always present in the filter.
 */
export async function removeFavorite(
  consumerLineId: string,
  artistId: string,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('favorites')
    .delete()
    .eq('consumer_line_id', consumerLineId)
    .eq('artist_id', artistId)

  if (error) throw new Error(`Failed to remove favorite: ${error.message}`)
}

interface FavoriteArtistJoinRow {
  artists: SupabaseArtistRow | null
}

/**
 * Return the favorited artists for a consumer as fully transformed
 * ArtistWithDetails, reusing the public artist projection.
 */
export async function getFavoriteArtists(
  consumerLineId: string,
): Promise<ArtistWithDetails[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('favorites')
    .select(`artists(${ARTIST_PUBLIC_SELECT})`)
    .eq('consumer_line_id', consumerLineId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as FavoriteArtistJoinRow[])
    .map((row) => row.artists)
    .filter((a): a is SupabaseArtistRow => a !== null)
    .map(transformArtistRow)
}

/**
 * Whether the consumer has favorited the given artist.
 */
export async function isFavorited(
  consumerLineId: string,
  artistId: string,
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('favorites')
    .select('artist_id')
    .eq('consumer_line_id', consumerLineId)
    .eq('artist_id', artistId)
    .maybeSingle()

  return data !== null
}
