import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReviewListItem } from '@/components/artist/ReviewList'

function safeAdminClient(): SupabaseClient<Database> | null {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

type ReviewRow = Database['public']['Tables']['reviews']['Row']

/** Columns the public read path needs — no `artist_id` / `id` leak downstream. */
const REVIEW_PUBLIC_SELECT =
  'id, artist_id, author_line_user_id, rating, comment, created_at' as const

/**
 * Map a DB `reviews` row to the presentational {@link ReviewListItem} shape the
 * already-shipped `ArtistReviewsSection` / `ReviewList` consume. We reuse that
 * component-layer type rather than defining a divergent review shape.
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
 * Pure public read via the admin-client pattern (mirrors
 * `getArtistBySlug` in `./artists`). Degrades to `[]` — never throws — when the
 * admin client is unavailable, the query errors, or there is no data, so a
 * reviews failure cannot 500 the artist page.
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
