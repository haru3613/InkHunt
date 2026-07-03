-- HAR-436 (v0.3 W1): per-artist rating aggregate view.
-- Foundation for Wave-2 rating sort (`評分最高`) + filter (`最低評分` 4★+) across
-- the WHOLE artist set at query time (today's getReviewSummariesByArtistIds only
-- aggregates the current page's ids in JS — it can't order/filter the full set).
--
-- ADDITIVE + REVERSIBLE: creates one read-only VIEW. No table/column/data change.
-- Down-migration: `DROP VIEW IF EXISTS artist_rating_summary;` (at bottom).
--
-- Formula authority — keep DB and app in lock-step:
--   The app's computeReviewSummary (src/lib/reviews.ts) defines a review's
--   "overall rating" as the single `rating` column of the `reviews` table
--   (011_reviews.sql; 1–5). NOTE: the HAR-436 ticket text predates 011 and
--   describes a 4-column mean (rating_skill/communication/environment/value);
--   that was the DROPPED prototype table (011 superseded it with one `rating`).
--   This view follows the SHIPPED schema + the app authority, not the stale text.
--
--   avg_rating  = round(avg(rating), 1)  -- mean over an artist's reviews, 1 dp
--                                           (matches computeReviewSummary, e.g.
--                                            ratings [5,4,4] -> 4.3).
--   review_count = count(rating)          -- number of reviews considered.
--
-- Zero-review artists: KEPT as `avg_rating = 0, review_count = 0` (LEFT JOIN +
--   COALESCE), mirroring computeReviewSummary([]) === { average: 0, count: 0 }.
--   So the consumer can ORDER BY / filter the full artist set without a second
--   "artists with no reviews" pass.

CREATE OR REPLACE VIEW artist_rating_summary AS
SELECT
  a.id AS artist_id,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::numeric AS avg_rating,
  COUNT(r.rating)::int AS review_count
FROM artists a
LEFT JOIN reviews r ON r.artist_id = a.id
GROUP BY a.id;

COMMENT ON VIEW artist_rating_summary IS 'HAR-436 per-artist mean rating round(avg(rating),1) plus review_count over the reviews table, zero-review artists kept as 0/0, mirrors computeReviewSummary in src/lib/reviews.ts, read-only public read';

-- Read-only public surface: the /artists discovery page consumes this view.
-- No INSERT/UPDATE/DELETE path is granted (a view over reviews is not writable
-- here, and the base-table RLS on reviews is unchanged by this migration).
GRANT SELECT ON artist_rating_summary TO anon, authenticated;

-- downgrade():
--   DROP VIEW IF EXISTS artist_rating_summary;
