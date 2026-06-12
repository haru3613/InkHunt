-- HAR-372: reviews table + RLS (v0.2 foundation)
-- Reversible by `drop table reviews` (downgrade at bottom).

-- An UNTRACKED prototype `reviews` table (4-dimension rating: rating_skill/
-- communication/environment/value + consumer_name/photo_urls/verified) exists
-- on the staging DB from early experimentation — it is the source of the
-- database.ts schema drift. Verified 0 rows on 2026-06-12 before dropping.
-- The HAR-372 spec (single 1-5 rating + author_line_user_id) supersedes it.
DROP TABLE IF EXISTS reviews;

CREATE TABLE reviews (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id            UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  author_line_user_id  TEXT NOT NULL,
  rating               INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment              TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, author_line_user_id)  -- one review per user per artist
);

-- Aggregation reads (ArtistReviewSummary / RatingBreakdown) filter by artist.
CREATE INDEX reviews_artist_id_idx ON reviews (artist_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read: review content is public marketplace data.
CREATE POLICY "Public can read reviews" ON reviews FOR SELECT
  USING (true);

-- Authenticated LINE user can only write reviews as themselves
-- (mirrors 006_fix_rls_line_user_id.sql helper).
CREATE POLICY "User can insert own review" ON reviews FOR INSERT
  WITH CHECK (author_line_user_id = current_line_user_id());

-- Author-only update/delete; no public mutation path. WITH CHECK is explicit:
-- without it Postgres falls back to USING for the new row, which would leave
-- artist_id mutable (a review could be moved onto another artist).
CREATE POLICY "Author can update own review" ON reviews FOR UPDATE
  USING (author_line_user_id = current_line_user_id())
  WITH CHECK (author_line_user_id = current_line_user_id());

CREATE POLICY "Author can delete own review" ON reviews FOR DELETE
  USING (author_line_user_id = current_line_user_id());

-- RLS WITH CHECK cannot compare against OLD values, so it alone cannot stop an
-- author from re-pointing their review at a different artist (UPDATE artist_id).
-- Column-level grants close that: authors may only edit rating + comment.
REVOKE UPDATE ON reviews FROM anon, authenticated;
GRANT UPDATE (rating, comment) ON reviews TO authenticated;

-- downgrade():
--   DROP TABLE reviews;  -- cascades policies + index; helper functions are shared (006), untouched.
