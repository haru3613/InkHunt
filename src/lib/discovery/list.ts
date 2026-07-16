import {
  getArtists,
  type ArtistFilters,
} from '@/lib/supabase/queries/artists'
import { getFavoritedArtistIds } from '@/lib/supabase/queries/favorites'
import { discoveryHasActiveFilters } from '@/lib/discovery/parse'
import type {
  ArtistListingResult,
  DiscoveryQuery,
  DiscoveryViewer,
} from '@/lib/discovery/types'

function toArtistFilters(query: DiscoveryQuery): ArtistFilters {
  return {
    style: query.style,
    city: query.city,
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    budget: query.budget,
    service: query.service,
    q: query.q,
    minRating: query.minRating,
    healed: query.healed,
    isNew: query.isNew,
  }
}

/**
 * Deep listing entry: run discovery query and optionally decorate with hearts.
 * Strangler: delegates SQL to existing getArtists / getFavoritedArtistIds.
 */
export async function listForViewer(
  query: DiscoveryQuery,
  viewer: DiscoveryViewer | null,
): Promise<ArtistListingResult> {
  const { data: artists, total } = await getArtists(toArtistFilters(query))

  const favoritedIds =
    viewer && artists.length > 0
      ? await getFavoritedArtistIds(
          viewer.lineUserId,
          artists.map((a) => a.id),
        )
      : new Set<string>()

  return {
    artists,
    favoritedIds,
    total,
    page: query.page,
    pageSize: query.pageSize,
    query,
    hasActiveFilters: discoveryHasActiveFilters(query),
  }
}
