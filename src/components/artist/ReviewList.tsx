import { ReviewCard, type ReviewCardReview } from './ReviewCard'

/**
 * One review item this list maps over.
 *
 * Intentionally identical to {@link ReviewCardReview} (the single-review shape
 * `ReviewCard` already consumes) so the list stays a pure, presentational leaf
 * that the future API-fed page (Wave 3) can feed without any DB coupling. We
 * deliberately do NOT import a DB row type.
 */
export type ReviewListItem = ReviewCardReview

/** Sort order for the rendered list. */
export type ReviewListSort = 'newest' | 'highest'

export interface ReviewListProps {
  /** Reviews to render. An empty array yields the empty state. */
  reviews: ReviewListItem[]
  /**
   * Display order. `'newest'` (default) sorts by `created_at` descending;
   * `'highest'` sorts by `rating` descending, tie-broken by newest first.
   * The input array is never mutated — a copy is sorted.
   */
  sort?: ReviewListSort
}

/** Empty-state copy, kept consistent with the zh-TW UI. */
const EMPTY_MESSAGE = '還沒有評價'

/**
 * Return a sorted COPY of `reviews`. Never mutates the input.
 *
 * `'newest'`: most recent `created_at` first.
 * `'highest'`: highest `rating` first, then most recent `created_at` as a
 * stable tie-breaker so equal ratings still read newest-first.
 */
function sortReviews(
  reviews: ReviewListItem[],
  sort: ReviewListSort,
): ReviewListItem[] {
  const byNewest = (a: ReviewListItem, b: ReviewListItem) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

  if (sort === 'highest') {
    return [...reviews].sort(
      (a, b) => b.rating - a.rating || byNewest(a, b),
    )
  }
  return [...reviews].sort(byNewest)
}

/**
 * Build a stable React key for a review.
 *
 * `ReviewListItem` has no `id`, so we compose one from the fields that uniquely
 * identify a review in practice (author + timestamp + rating), falling back to
 * the index only as a final disambiguator for otherwise-identical rows.
 */
function reviewKey(review: ReviewListItem, index: number): string {
  return `${review.author_line_user_id ?? 'anon'}:${review.created_at}:${review.rating}:${index}`
}

/**
 * Presentational list of reviews.
 *
 * Maps each review to a {@link ReviewCard}; renders a clean empty state when
 * there are none. No data fetching — the caller supplies the `reviews` array.
 */
export function ReviewList({ reviews, sort = 'newest' }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p
        className="py-6 text-center text-sm text-zinc-500"
        data-testid="review-list-empty"
      >
        {EMPTY_MESSAGE}
      </p>
    )
  }

  const ordered = sortReviews(reviews, sort)

  return (
    <div className="flex flex-col" data-testid="review-list">
      {ordered.map((review, index) => (
        <ReviewCard key={reviewKey(review, index)} review={review} />
      ))}
    </div>
  )
}
