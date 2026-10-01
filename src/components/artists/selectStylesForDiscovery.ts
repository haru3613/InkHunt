import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

/**
 * Prefer local curated assets during cold start (more reliable than remote Unsplash).
 * Order matches hand-picked public/styles/*.avif where possible.
 */
export const COLD_START_STYLE_ORDER = [
  'floral',
  'lettering',
  'illustrative',
  'watercolor',
  'japanese-traditional',
  'geometric',
  'neo-traditional',
  'dotwork',
  'ornamental',
  'surrealism',
  'abstract',
  'other',
] as const

export const COLD_START_LIMIT = 8

/** Slugs that have a STYLE_IMAGES entry (local or remote) — used for cold-start fill. */
export const STYLES_WITH_FALLBACK_IMAGE = new Set([
  'fine-line',
  'micro',
  'realism',
  'floral',
  'blackwork',
  'lettering',
  'illustrative',
  'anime',
  'watercolor',
  'japanese-traditional',
  'geometric',
  'neo-traditional',
  'american-traditional',
  'dotwork',
  'portrait',
  'ornamental',
  'handpoke',
  'tribal',
  'surrealism',
  'abstract',
  'other',
])

/**
 * Pick which styles appear on the discovery grid.
 * - With supply: only styles that have ≥1 active artist (no "0 位" graveyard).
 * - Cold start (zero supply): curated subset with images, not the full catalog.
 */
export function selectStylesForDiscovery(
  styles: readonly StyleRow[],
  artistCounts: ReadonlyMap<string, number>,
): { styles: StyleRow[]; isColdStart: boolean } {
  const withSupply = styles
    .filter((s) => (artistCounts.get(s.slug) ?? 0) > 0)
    .sort(
      (a, b) =>
        (artistCounts.get(b.slug) ?? 0) - (artistCounts.get(a.slug) ?? 0),
    )

  if (withSupply.length > 0) {
    return { styles: withSupply, isColdStart: false }
  }

  const bySlug = new Map(styles.map((s) => [s.slug, s]))
  const ordered: StyleRow[] = []
  for (const slug of COLD_START_STYLE_ORDER) {
    const row = bySlug.get(slug)
    if (row) ordered.push(row)
  }
  for (const s of styles) {
    if (
      !ordered.some((o) => o.id === s.id) &&
      STYLES_WITH_FALLBACK_IMAGE.has(s.slug)
    ) {
      ordered.push(s)
    }
  }

  return {
    styles: ordered.slice(0, COLD_START_LIMIT),
    isColdStart: true,
  }
}
