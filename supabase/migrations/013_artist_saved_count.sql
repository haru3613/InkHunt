-- HAR-483 (v0.7 W1): per-artist saved-count aggregate view.
-- Foundation for the v0.7「X 人收藏」social-proof cue at discovery, alongside
-- the shipped rating summary (012_artist_rating_summary.sql / HAR-436). The
-- count must be aggregable over the WHOLE artist set at query time — today's
-- src/lib/supabase/queries/favorites.ts only reads/writes per-consumer rows,
-- it can't count the full set.
--
-- ADDITIVE + REVERSIBLE: creates one read-only VIEW. No table/column/data
-- change. Down-migration: `DROP VIEW IF EXISTS artist_saved_count;` (at bottom).
--
-- saved_count = count(favorites.consumer_line_id) per artist. The `favorites`
--   table (001_initial_schema.sql) has PK (consumer_line_id, artist_id), so one
--   row == one consumer saved that artist; counting consumer_line_id counts
--   distinct savers without a DISTINCT.
--
-- Zero-save artists: KEPT as `saved_count = 0` (LEFT JOIN — COUNT of the
--   nullable joined column yields 0 for no matches), mirroring the rating
--   view's zero-review 0-row handling. So a consumer can ORDER BY / display the
--   full artist set without a second "artists with no saves" pass.

CREATE OR REPLACE VIEW artist_saved_count AS
SELECT
  a.id AS artist_id,
  COUNT(f.consumer_line_id)::int AS saved_count
FROM artists a
LEFT JOIN favorites f ON f.artist_id = a.id
GROUP BY a.id;

COMMENT ON VIEW artist_saved_count IS 'HAR-483 per-artist saved_count = count(favorites) over the favorites table, zero-save artists kept as 0, read-only public read';

-- Read-only public surface: the /artists discovery page consumes this view.
-- No INSERT/UPDATE/DELETE path is granted (a view over favorites is not
-- writable here, and the base-table RLS on favorites is unchanged by this
-- migration).
GRANT SELECT ON artist_saved_count TO anon, authenticated;

-- downgrade():
--   DROP VIEW IF EXISTS artist_saved_count;
