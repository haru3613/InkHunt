import { z } from 'zod'

/**
 * Validates the body for adding/removing a favorite artist.
 * `favorites` PK is (consumer_line_id, artist_id); the consumer id comes from
 * the session, so the only client-supplied field is the artist id.
 */
export const favoriteInputSchema = z.object({
  artistId: z.string().uuid(),
})

export type FavoriteInput = z.infer<typeof favoriteInputSchema>
