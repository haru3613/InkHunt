-- HAR-661: RLS hardening
-- Live-DB audit found permissive policies, SECURITY DEFINER views, and a
-- spoofable identity function (user_metadata is client-editable via
-- auth.updateUser()). This migration closes each confirmed hole.
-- All app writes go through the service-role admin client
-- (src/lib/supabase/queries/*), which bypasses RLS — so dropping these
-- anon/authenticated policies does not affect app behavior.

-- 1. Drop WITH CHECK (true) INSERT policies (any logged-in user could insert
--    arbitrary rows directly via the anon-key client).
DROP POLICY IF EXISTS "Authenticated users can insert artists" ON artists;
DROP POLICY IF EXISTS "Authenticated can create inquiries" ON inquiries;

-- 2. Drop legacy permissive messages INSERT policy. It only checked inquiry
--    membership, and being OR-ed with the strict sender-validated policies
--    made sender forgery possible.
DROP POLICY IF EXISTS "Linked users can insert messages" ON messages;

-- 3. Artists could UPDATE their own row with no column guard — including
--    status (self-activate past admin review) and featured (self-feature).
--    A column-level REVOKE would be a no-op: the Supabase default table-level
--    UPDATE grant covers all columns and is stored separately from column
--    ACLs. Revoke the whole privilege instead — all artist writes go through
--    the service-role admin client, so nothing legitimate loses access.
--    (Same pattern as 011_reviews.sql; re-grant specific columns there if a
--    client-side write path is ever added.)
REVOKE UPDATE ON artists FROM anon, authenticated;

-- 4. SECURITY DEFINER views bypass RLS on the underlying tables
--    (Supabase advisor ERROR level). Make them run as the caller,
--    and drop the default full write grants on the views.
--    Note: all current reads of these views go through the service role
--    (BYPASSRLS), so counts stay correct. If an anon-key read path is ever
--    added, favorites/reviews RLS will hide rows and counts will read low —
--    add a permissive SELECT policy for aggregation at that point.
ALTER VIEW artist_rating_summary SET (security_invoker = true);
ALTER VIEW artist_saved_count SET (security_invoker = true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON artist_rating_summary FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON artist_saved_count FROM anon, authenticated;

-- 5. Move identity to app_metadata. raw_user_meta_data is client-editable
--    (auth.updateUser()); raw_app_meta_data is service-role-only.
--    Backfill existing users first so no session loses identity.
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('line_user_id', raw_user_meta_data->>'line_user_id')
WHERE raw_user_meta_data ? 'line_user_id'
  AND (raw_app_meta_data->>'line_user_id')
      IS DISTINCT FROM (raw_user_meta_data->>'line_user_id');

-- 6. Re-point the RLS identity function at app_metadata and pin search_path
--    (Supabase advisor WARN: function_search_path_mutable).
--    Note: JWT app_metadata claims refresh on token renewal (<=1h for
--    existing sessions); the server-side getUser() path is fresh immediately.
CREATE OR REPLACE FUNCTION current_line_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth.jwt()->'app_metadata'->>'line_user_id'
$$;

CREATE OR REPLACE FUNCTION current_artist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.artists
  WHERE line_user_id = public.current_line_user_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
