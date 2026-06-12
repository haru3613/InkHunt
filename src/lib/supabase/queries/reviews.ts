import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReviewListItem } from '@/components/artist/ReviewList'

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
