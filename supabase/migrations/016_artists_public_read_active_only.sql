-- 016 (HAR-544): stop exposing pending applicants' PII publicly.
--
-- Migration 002 allowed public SELECT on artists with status IN ('active',
-- 'pending'), which makes unreviewed applicants' data (line_user_id, address,
-- lat/lng, pricing, ...) readable with the anon key the moment they submit the
-- onboarding form. Tighten public read to active-only, and add an owner-read
-- policy so a pending/suspended artist can still read their OWN row — the
-- onboarding status page (申請審核中) and the /api/artists/[slug] self-view in
-- the artist dashboard depend on that self-read path.

DROP POLICY IF EXISTS "Anyone can read active artists" ON artists;

CREATE POLICY "Anyone can read active artists" ON artists
  FOR SELECT USING (status = 'active');

CREATE POLICY "Artist can read own profile" ON artists
  FOR SELECT USING (line_user_id = current_line_user_id());

-- downgrade():
--   drop policy if exists "Artist can read own profile" on artists;
--   drop policy if exists "Anyone can read active artists" on artists;
--   create policy "Anyone can read active artists" on artists
--     for select using (status = 'active' or status = 'pending');
