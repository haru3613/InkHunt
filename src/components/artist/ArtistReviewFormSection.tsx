'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewForm } from './ReviewForm'
import { useAuth } from '@/hooks/useAuth'
import type { ReviewInput } from '@/lib/validations/review'

export interface ArtistReviewFormSectionProps {
  /** Artist the review is for (UUID) — passed through to {@link ReviewForm}. */
  artistId: string
  /** Artist slug — the POST target path segment. */
  artistSlug: string
}

/** Maps a non-2xx response to a user-facing message (zh-TW), with fallbacks. */
async function messageForError(response: Response): Promise<string> {
  let body: { error?: string } = {}
  try {
    body = await response.json()
  } catch {
    // non-JSON body — fall through to status-based defaults
  }
  if (response.status === 401) return '請先以 LINE 登入後再評價'
  if (response.status === 409) return body.error ?? '你已經評價過這位刺青師'
  if (response.status === 400) return body.error ?? '評價內容有誤，請檢查後再送出'
  return body.error ?? '送出失敗，請稍後再試'
}

/**
 * Client wrapper that mounts the (client-only) {@link ReviewForm} on the
 * server-rendered artist page and wires its `onSubmit` to the authed POST route
 * (`/api/artists/[slug]/reviews`).
 *
 * Responsibilities (Wave 3 write-path):
 * - Gate on login: a logged-out user is sent through the LINE redirect instead
 *   of firing a request that the route would 401 anyway.
 * - POST the validated payload; the **server** derives the author from the
 *   session — this component never sends an author id.
 * - Reflect the in-flight state via `isSubmitting` (disables the submit button).
 * - Surface 400 / 401 / 409 outcomes inline without crashing.
 * - On 201, refresh the server component so the newly inserted review appears in
 *   the list, and swap the form for a thank-you state.
 */
export function ArtistReviewFormSection({
  artistId,
  artistSlug,
}: ArtistReviewFormSectionProps) {
  const router = useRouter()
  const { isLoggedIn, loginWithRedirect } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(
    async (data: ReviewInput) => {
      if (!isLoggedIn) {
        loginWithRedirect(
          typeof window !== 'undefined' ? window.location.pathname : undefined,
        )
        return
      }

      setError(null)
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/artists/${artistSlug}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          setError(await messageForError(response))
          return
        }

        setSubmitted(true)
        router.refresh()
      } catch {
        setError('送出失敗，請稍後再試')
      } finally {
        setIsSubmitting(false)
      }
    },
    [artistSlug, isLoggedIn, loginWithRedirect, router],
  )

  if (submitted) {
    return (
      <div
        className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"
        role="status"
      >
        感謝你的評價，已送出！
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">撰寫評價</h3>
      {error && (
        <p className="text-sm text-ink-error" role="alert">
          {error}
        </p>
      )}
      <ReviewForm
        artistId={artistId}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
