import type {
  ArtistBudget,
  ArtistService,
  ArtistSort,
  ArtistWithDetails,
} from '@/lib/supabase/queries/artists'

/**
 * Normalized listing query for Artist discovery.
 * Pure data — no URL, no Supabase.
 */
export interface DiscoveryQuery {
  style: string | null
  city: string | null
  page: number
  pageSize: number
  sort: ArtistSort
  budget: ArtistBudget
  service: ArtistService | null
  q: string | null
  minRating: number | null
  healed: boolean
  isNew: boolean
}

/**
 * Result bag for `/artists` (and future callers): everything the view needs
 * after parse + list + optional heart decoration.
 */
export interface ArtistListingResult {
  artists: ArtistWithDetails[]
  /** Artist ids the viewer has favorited (subset of this page). Empty when logged out. */
  favoritedIds: ReadonlySet<string>
  total: number
  page: number
  pageSize: number
  query: DiscoveryQuery
  hasActiveFilters: boolean
}

/** Minimal viewer identity for heart decoration. */
export interface DiscoveryViewer {
  lineUserId: string
}
