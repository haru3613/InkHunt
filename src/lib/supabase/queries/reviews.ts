import type { Database, Review } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReviewListItem } from '@/components/artist/ReviewList'
import type { ReviewInput } from '@/lib/validations/review'

/**
 * Build an admin Supabase client, returning `null` instead of throwing when the
 * service-role env is absent (mirrors the guard in `./artists.ts`). Keeping the
 * read path null-tolerant lets a misconfigured/build-time environment degrade to
 * an empty result instead of crashing the (public, server-rendered) artist page.
 */
function safeAdminClient(): SupabaseClient<Database> | null {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

type ReviewRow = Database['public']['Tables']['reviews']['Row']

/** Columns selected for the public read path. */
const REVIEW_PUBLIC_SELECT =
  'id, artist_id, author_line_user_id, rating, comment, created_at' as const

/**
 * Map a DB review row to the presentational `ReviewListItem` shape that
 * `ArtistReviewsSection` / `ReviewList` already consume. We deliberately project
 * down to that shape (dropping `id` / `artist_id`) rather than passing the raw
 * row, so the data layer stays decoupled from the component's prop contract —
 * the type is imported from the component layer, never redefined here.
 */
function toReviewListItem(row: ReviewRow): ReviewListItem {
  return {
    rating: row.rating,
    comment: row.comment,
    author_line_user_id: row.author_line_user_id,
    created_at: row.created_at,
  }
}

/**
 * Fetch a single artist's reviews, newest first.
 *
 * Pure public read via the admin-client pattern (RLS-bypassing service role,
 * same as the other read queries). Filtered by `artist_id`, ordered by
 * `created_at` descending. Always resolves — never throws — degrading to `[]` on
 * a missing client, a query error, or a null result, so the caller can render a
 * clean empty state instead of 500-ing the page.
 */
export async function getReviewsByArtistId(
  artistId: string,
): Promise<ReviewListItem[]> {
  const supabase = safeAdminClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_PUBLIC_SELECT)
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as ReviewRow[]).map(toReviewListItem)
}

/** The artist `slug` did not resolve to a row — the route maps this to 404. */
export class ArtistNotFoundError extends Error {}

/**
 * A review by this author for this artist already exists (the table's
 * `unique (artist_id, author_line_user_id)` constraint fired). The route maps
 * this to a clean 409 — one review per user per artist.
 */
export class ReviewConflictError extends Error {}

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Insert a single review for `slug` on behalf of `authorLineUserId`.
 *
 * Auth/identity is the caller's job: `authorLineUserId` is the **server-derived
 * session user**, never client-supplied — the route passes it explicitly and the
 * insert payload uses it verbatim (the `artistId` in `data` is only used by the
 * shared Zod schema and is NOT trusted for the write; we resolve the artist by
 * the URL slug instead).
 *
 * This is a single per-request INSERT — never a loop / batch / cron write.
 * Throws {@link ArtistNotFoundError} when the slug is unknown and
 * {@link ReviewConflictError} on the duplicate-review unique violation; the
 * route translates these to 404 / 409.
 */
export async function createReview(
  slug: string,
  authorLineUserId: string,
  data: ReviewInput,
): Promise<Review> {
  const admin = createAdminClient()

  const { data: artist, error: artistError } = await admin
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .single()

  if (artistError || !artist) {
    throw new ArtistNotFoundError(`No artist for slug "${slug}"`)
  }

  const { data: review, error: insertError } = await admin
    .from('reviews')
    .insert({
      artist_id: artist.id,
      author_line_user_id: authorLineUserId,
      rating: data.rating,
      comment: data.comment ?? null,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === PG_UNIQUE_VIOLATION) {
      throw new ReviewConflictError('Review already exists for this artist')
    }
    throw new Error(`Failed to create review: ${insertError.message}`)
  }

  if (!review) {
    throw new Error('Failed to create review: no row returned')
  }

  return review
}
