import type { ReviewSummary } from '@/lib/reviews'
import { ArtistReviewSummary } from './ArtistReviewSummary'
import { RatingBreakdown } from './RatingBreakdown'
import { ReviewList, type ReviewListItem } from './ReviewList'

export interface ArtistReviewsSectionProps {
  /** Pre-computed summary from `computeReviewSummary` (`@/lib/reviews`). */
  summary: ReviewSummary
  /**
   * Reviews to list. The same `ReviewListItem` shape `ReviewList` (HAR-386)
   * already consumes — not a divergent local type.
   */
  reviews: ReviewListItem[]
}

/** Section heading copy, consistent with the zh-TW UI. */
const HEADING = '顧客評價'

/**
 * Presentational, props-driven reviews section for an artist page.
 *
 * Assembles the already-shipped presentational pieces into one layout unit, in
 * order: a heading, the {@link ArtistReviewSummary} (average + count), the
 * {@link RatingBreakdown} (per-star bars), and the {@link ReviewList}. Does no
 * data fetching or aggregation — the caller (Wave 3) fetches reviews, computes
 * the summary via `computeReviewSummary`, and passes both down.
 *
 * Empty state (`summary.count === 0` / `reviews` empty) renders cleanly: the
 * heading shows, the breakdown renders all-zero bars (no `NaN`), and the list
 * shows its empty-state message. Each child already guards its own zero case,
 * so this container stays a thin composition with no extra branching.
 */
export function ArtistReviewsSection({
  summary,
  reviews,
}: ArtistReviewsSectionProps) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-label={HEADING}
      data-testid="artist-reviews-section"
    >
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {HEADING}
      </h2>

      <ArtistReviewSummary summary={summary} />

      <RatingBreakdown distribution={summary.distribution} total={summary.count} />

      <ReviewList reviews={reviews} />
    </section>
  )
}
