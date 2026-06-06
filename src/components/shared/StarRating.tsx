'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_STARS = 5

export interface StarRatingProps {
  /** Current rating, 0–5. Values are clamped into range for display. */
  value: number
  /**
   * Called with the 1-indexed star number when the user picks a rating.
   * When omitted (or `readOnly` is true) the component renders read-only.
   */
  onChange?: (value: number) => void
  /** Pixel size of each star. Defaults to 20. */
  size?: number
  /** Force read-only display even when `onChange` is provided. */
  readOnly?: boolean
  className?: string
}

function clampValue(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(MAX_STARS, Math.round(value)))
}

/**
 * Reusable 5-star rating control.
 *
 * - Display mode (no `onChange`, or `readOnly`): a non-interactive row of stars
 *   labelled with the rating via `aria-label`.
 * - Interactive mode (`onChange` provided): a `radiogroup` of star buttons where
 *   clicking / activating the n-th star reports `n`. Keyboard operable.
 */
export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
  className,
}: StarRatingProps) {
  const filled = clampValue(value)
  const interactive = typeof onChange === 'function' && !readOnly

  if (!interactive) {
    return (
      <div
        role="img"
        aria-label={`評分 ${filled} 分（滿分 ${MAX_STARS} 分）`}
        className={cn('inline-flex items-center gap-0.5', className)}
      >
        {Array.from({ length: MAX_STARS }, (_, i) => {
          const isFilled = i < filled
          return (
            <Star
              key={i}
              data-testid={`star-${i + 1}`}
              data-filled={isFilled}
              aria-hidden="true"
              width={size}
              height={size}
              className={cn(
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-zinc-600',
              )}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={`評分（滿分 ${MAX_STARS} 分）`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const starNumber = i + 1
        const isFilled = starNumber <= filled
        const isChecked = starNumber === filled
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={`${starNumber} 顆星`}
            onClick={() => onChange(starNumber)}
            className="cursor-pointer rounded p-0.5 text-zinc-600 transition-colors hover:text-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Star
              data-testid={`star-${starNumber}`}
              data-filled={isFilled}
              aria-hidden="true"
              width={size}
              height={size}
              className={cn(
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-current',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
