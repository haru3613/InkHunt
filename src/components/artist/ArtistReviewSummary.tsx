import { StarRating } from '@/components/shared/StarRating'
import type { RatingValue, ReviewSummary } from '@/lib/reviews'

export interface ArtistReviewSummaryProps {
  /** Pre-computed summary from `computeReviewSummary` (`@/lib/reviews`). */
  summary: ReviewSummary
}

/** Star buckets rendered top-to-bottom in the distribution breakdown. */
const BUCKETS: RatingValue[] = [5, 4, 3, 2, 1]

/**
 * Presentational, props-driven review summary for an artist.
 *
 * Composes the shared {@link StarRating} (read-only) with the average, count,
 * and a 5 → 1 per-star distribution derived from a {@link ReviewSummary}. Does
 * no data fetching — the caller supplies the already-aggregated summary.
 *
 * When `summary.count === 0` it renders a `尚無評價` placeholder instead of an
 * empty/zero-star block.
 */
export function ArtistReviewSummary({ summary }: ArtistReviewSummaryProps) {
  const { average, count, distribution } = summary

  if (count === 0) {
    return (
      <div className="text-sm text-zinc-500" data-testid="review-summary-empty">
        尚無評價
      </div>
    )
  }

  // Largest bucket count drives the relative bar widths. At least 1 so a
  // division never blows up (count > 0 here, so this is belt-and-braces).
  const maxBucket = Math.max(
    1,
    ...BUCKETS.map((bucket) => distribution[bucket]),
  )

  return (
    <section
      className="flex flex-col gap-3"
      aria-label="評價總覽"
      data-testid="review-summary"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {average}
        </span>
        <StarRating value={average} readOnly />
        <span className="text-sm text-zinc-500">（{count} 則評價）</span>
      </div>

      <ul
        className="flex flex-col gap-1"
        data-testid="review-distribution"
        aria-label="評分分布"
      >
        {BUCKETS.map((bucket) => {
          const bucketCount = distribution[bucket]
          const widthPct = (bucketCount / maxBucket) * 100
          return (
            <li
              key={bucket}
              data-testid={`review-distribution-row-${bucket}`}
              data-bucket={bucket}
              className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
            >
              <span className="w-6 shrink-0 tabular-nums">{bucket} 星</span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${widthPct}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums">
                {bucketCount}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
