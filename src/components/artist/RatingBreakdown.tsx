import type { RatingValue } from '@/lib/reviews'

export interface RatingBreakdownProps {
  /**
   * Per-star review counts (buckets 1–5), as produced by
   * `computeReviewSummary` (`@/lib/reviews`) on `ReviewSummary.distribution`.
   */
  distribution: Record<RatingValue, number>
  /**
   * Total number of reviews the bars are proportioned against. Defaults to the
   * sum of the distribution values. Pass an explicit total when the caller
   * tracks the review count independently of the buckets.
   */
  total?: number
}

/** Star buckets rendered top-to-bottom, 5★ → 1★ (conventional rating panels). */
const BUCKETS: RatingValue[] = [5, 4, 3, 2, 1]

/**
 * Presentational, props-driven per-star rating histogram.
 *
 * Renders five rows (5★ down to 1★), each with a star label, a proportion bar
 * whose width is `count / total`, and the raw count exposed as text. Does no
 * fetching or aggregation — the caller supplies the already-computed
 * `distribution` (and optionally the `total`).
 *
 * Guards `total === 0` (no reviews) so every bar renders empty with a `0`
 * count and no division-by-zero / `NaN` width.
 */
export function RatingBreakdown({ distribution, total }: RatingBreakdownProps) {
  const resolvedTotal =
    total ?? BUCKETS.reduce((sum, bucket) => sum + distribution[bucket], 0)

  return (
    <ul
      className="flex flex-col gap-1"
      data-testid="rating-breakdown"
      aria-label="評分分布"
    >
      {BUCKETS.map((bucket) => {
        const count = distribution[bucket]
        // Guard against total === 0: empty bars, no NaN width.
        const widthPct = resolvedTotal > 0 ? (count / resolvedTotal) * 100 : 0
        return (
          <li
            key={bucket}
            data-testid={`rating-breakdown-row-${bucket}`}
            data-bucket={bucket}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
          >
            <span className="w-8 shrink-0 tabular-nums">{bucket}★</span>
            <span
              className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
              aria-hidden="true"
            >
              <span
                data-testid="rating-breakdown-bar-fill"
                className="block h-full rounded-full bg-amber-400"
                style={{ width: `${widthPct}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums">{count}</span>
          </li>
        )
      })}
    </ul>
  )
}
