/**
 * Artist discovery — deep listing module (strangler v1).
 *
 * Interface: parseDiscoveryQuery · listForViewer · types
 * Implementation still delegates to queries/artists + favorites.
 */
export type {
  DiscoveryQuery,
  DiscoveryViewer,
  ArtistListingResult,
} from '@/lib/discovery/types'
export {
  parseDiscoveryQuery,
  discoveryHasActiveFilters,
} from '@/lib/discovery/parse'
export { listForViewer } from '@/lib/discovery/list'
