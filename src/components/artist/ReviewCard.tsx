import { StarRating } from '@/components/shared/StarRating'

/**
 * Minimal shape of a single review needed to render one card.
 *
 * Kept local + presentational on purpose — it mirrors the relevant columns of
 * the `reviews` table but deliberately does NOT import the DB row type, so this
 * component stays a pure props-driven leaf the future API-fed `ReviewList`
 * (Wave 3) can map over without coupling to the database layer.
 */
export interface ReviewCardReview {
  /** Star rating, 0–5. Passed straight to {@link StarRating}. */
  rating: number
  /** Free-text comment. Omitted from the layout when null / empty. */
  comment?: string | null
  /** LINE user id of the author. When absent the author label is omitted. */
  author_line_user_id?: string | null
  /** ISO-8601 creation timestamp, rendered as a human-readable date. */
  created_at: string
}

export interface ReviewCardProps {
  review: ReviewCardReview
}

/**
 * Format an ISO timestamp as a zh-TW calendar date.
 *
 * `@/lib/utils` only exposes a *relative* time helper (`formatRelativeTime`),
 * which is wrong for a review's permanent posted-on date, so per the ticket we
 * fall back to `toLocaleDateString('zh-TW')`. Invalid input degrades to the raw
 * string instead of throwing / rendering `Invalid Date`.
 */
function formatReviewDate(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleDateString('zh-TW')
}

/**
 * Presentational card for a single review.
 *
 * Composes the read-only {@link StarRating} with the (optional) comment, an
 * (optional) author label, and the formatted creation date. No data fetching —
 * the caller supplies a plain review object. Missing optional fields (comment,
 * author) are omitted cleanly without breaking the layout.
 */
export function ReviewCard({ review }: ReviewCardProps) {
  const { rating, comment, author_line_user_id, created_at } = review

  const hasComment = typeof comment === 'string' && comment.trim().length > 0
  const hasAuthor =
    typeof author_line_user_id === 'string' &&
    author_line_user_id.trim().length > 0

  return (
    <article
      className="flex flex-col gap-2 border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-700"
      data-testid="review-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarRating value={rating} readOnly size={16} />
          {hasAuthor && (
            <span
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
              data-testid="review-card-author"
            >
              匿名用戶
            </span>
          )}
        </div>
        <time
          dateTime={created_at}
          className="shrink-0 text-xs text-zinc-500"
          data-testid="review-card-date"
        >
          {formatReviewDate(created_at)}
        </time>
      </div>

      {hasComment && (
        <p
          className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300"
          data-testid="review-card-comment"
        >
          {comment}
        </p>
      )}
    </article>
  )
}
