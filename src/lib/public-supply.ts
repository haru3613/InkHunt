export const MIN_PUBLIC_ARTIST_COUNT = 3

export function hasPublicArtistCount(count: number): boolean {
  return count >= MIN_PUBLIC_ARTIST_COUNT
}
