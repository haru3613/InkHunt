'use client'

import { useState, useCallback } from 'react'
import { StarRating } from '@/components/shared/StarRating'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { reviewSchema, type ReviewInput } from '@/lib/validations/review'
import type { ZodError } from 'zod'

export interface ReviewFormProps {
  /**
   * Artist the review is for. Required to assemble a schema-valid payload
   * (`reviewSchema` mandates a UUID `artistId`). The parent supplies it.
   */
  artistId: string
  /**
   * Called with the validated {@link ReviewInput} on a successful submit.
   * This component performs NO network / DB / auth work — wiring the actual
   * write is the parent's responsibility (Wave 3).
   */
  onSubmit: (data: ReviewInput) => void | Promise<void>
  /** When true, the submit button is disabled and submission is blocked. */
  isSubmitting?: boolean
}

/** Maps a Zod error to `{ field: firstMessage }` for inline display. */
function flattenZodErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!result[key]) {
      result[key] = issue.message
    }
  }
  return result
}

/**
 * Presentational, props-driven review-input form.
 *
 * Composes the interactive {@link StarRating} (rating) with a `<textarea>`
 * (comment) and validates the combined payload against the shared
 * {@link reviewSchema}. On a valid submit it calls `onSubmit` once with the
 * parsed payload; on an invalid submit it surfaces inline field errors and
 * does NOT call `onSubmit`.
 *
 * Deliberately imports neither `supabase` nor `fetch`: submission is delegated
 * entirely to the `onSubmit` prop.
 */
export function ReviewForm({ artistId, onSubmit, isSubmitting = false }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleRatingChange = useCallback((value: number) => {
    setRating(value)
    setErrors((prev) => {
      if (!prev.rating) return prev
      const { rating: _omit, ...rest } = prev
      return rest
    })
  }, [])

  const handleCommentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setComment(event.target.value)
      setErrors((prev) => {
        if (!prev.comment) return prev
        const { comment: _omit, ...rest } = prev
        return rest
      })
    },
    [],
  )

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (isSubmitting) return

      const trimmed = comment.trim()
      const parsed = reviewSchema.safeParse({
        rating,
        // Omit `comment` entirely when empty so it stays optional/undefined.
        ...(trimmed.length > 0 ? { comment } : {}),
        artistId,
      })

      if (!parsed.success) {
        setErrors(flattenZodErrors(parsed.error))
        return
      }

      setErrors({})
      void onSubmit(parsed.data)
    },
    [rating, comment, artistId, isSubmitting, onSubmit],
  )

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {/* Rating */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground" id="review-rating-label">
          評分 <span className="text-ink-error">*</span>
        </span>
        <div aria-labelledby="review-rating-label">
          <StarRating value={rating} onChange={handleRatingChange} size={28} />
        </div>
        {errors.rating && (
          <p className="text-sm text-ink-error" data-testid="review-error-rating">
            {errors.rating}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-foreground"
        >
          評論
        </label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={handleCommentChange}
          placeholder="分享你的刺青體驗（選填）"
          className="min-h-24 rounded-lg focus-visible:ring-primary"
          aria-invalid={!!errors.comment}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          {errors.comment ? (
            <p className="text-sm text-ink-error" data-testid="review-error-comment">
              {errors.comment}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-ink-text-muted">{comment.length}/1000</span>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground hover:bg-ink-accent-hover"
      >
        {isSubmitting ? '送出中…' : '送出評價'}
      </Button>
    </form>
  )
}
