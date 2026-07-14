-- 017 (HAR-683): add missing indexes on hot read paths.
--
-- 001 indexed most FK columns but missed three:
--   * artist_styles(style_id)        — style-filtered artist listing joins
--   * inquiries(artist_id, status)   — artist dashboard filters by status;
--                                      supersedes scans on idx_inquiries_artist
--                                      for status-filtered queries
--   * favorites(artist_id)           — saved_count aggregation + FK cascade
--
-- Purely additive; IF NOT EXISTS keeps it idempotent.

CREATE INDEX IF NOT EXISTS idx_artist_styles_style ON artist_styles(style_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_artist_status ON inquiries(artist_id, status);
CREATE INDEX IF NOT EXISTS idx_favorites_artist ON favorites(artist_id);
