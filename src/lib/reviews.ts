/**
 * Review aggregation helpers.
 *
 * Pure, side-effect-free utilities for summarizing a list of reviews. Consumed
 * by the artist page (average + count display) and the `aggregateRating`
 * JSON-LD generator. No DB / network access here — callers pass plain objects.
 */

export type RatingValue = 1 | 2 | 3 | 4 | 5

export interface ReviewSummary {
  /** Mean rating rounded to 1 decimal place. `0` when there are no reviews. */
  average: number
  /** Number of reviews considered. */
  count: number
  /** How many reviews fall into each 1–5 rating bucket. */
  distribution: Record<RatingValue, number>
}

function emptyDistribution(): Record<RatingValue, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

/**
 * Summarize a list of reviews into an average, count, and per-bucket
 * distribution.
 *
 * - `average` is rounded to 1 decimal place (e.g. `[5, 4, 4]` → `4.3`).
 * - An empty list yields `{ average: 0, count: 0, distribution: {1..5: 0} }`.
 */
export function computeReviewSummary(
  reviews: { rating: number }[]
): ReviewSummary {
  const distribution = emptyDistribution()
  const count = reviews.length

  if (count === 0) {
    return { average: 0, count: 0, distribution }
  }

  let total = 0
  for (const { rating } of reviews) {
    total += rating
    const bucket = rating as RatingValue
    if (bucket in distribution) {
      distribution[bucket] += 1
    }
  }

  // Round to 1 decimal place. `+(...)` strips any float artifact so callers
  // get a clean number (e.g. 4.3, not 4.300000001).
  const average = +(Math.round((total / count) * 10) / 10)

  return { average, count, distribution }
}
