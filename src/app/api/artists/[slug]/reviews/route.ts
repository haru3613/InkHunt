import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { reviewSchema } from '@/lib/validations/review'
import {
  createReview,
  ArtistNotFoundError,
  ReviewConflictError,
} from '@/lib/supabase/queries/reviews'

/**
 * POST /api/artists/[slug]/reviews — submit one review for an artist.
 *
 * Mirrors the established authed-write pattern (inquiries / quote-requests):
 * authenticate the LINE user (401 if not), validate the body with the shared
 * `reviewSchema` (400 on invalid), then INSERT a single review whose
 * `author_line_user_id` is the **session** user — never a client-supplied value.
 * The table's `unique (artist_id, author_line_user_id)` constraint enforces
 * one-review-per-user; the conflict surfaces as a clean 409. An unknown slug is
 * a 404.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug } = await params
    const body = await request.json()
    const validation = reviewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const review = await createReview(slug, user.lineUserId, validation.data)

    return NextResponse.json({ id: review.id }, { status: 201 })
  } catch (err) {
    if (err instanceof ArtistNotFoundError) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }
    if (err instanceof ReviewConflictError) {
      return NextResponse.json({ error: '你已經評價過這位刺青師' }, { status: 409 })
    }
    return handleApiError(err)
  }
}
