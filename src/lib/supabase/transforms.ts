import type { Style } from '@/types/database'

export function flattenArtistStyles(artistStyles: unknown): Style[] {
  return (artistStyles as Array<{ styles: Style }> | null)?.map(
    (as) => as.styles,
  ) ?? []
}
