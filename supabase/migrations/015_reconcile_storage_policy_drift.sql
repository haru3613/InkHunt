-- 015: Reconcile live-DB drift so the Deploy "Verify no schema drift" gate passes.
--
-- Context (2026-07-03, supervised): `supabase db diff --linked` reported five
-- items of drift: four storage.objects policies that exist on the remote DB but
-- not in the migration history, plus pg_net enabled in the CLI shadow/local DB
-- by default but disabled on the remote project.
--
-- Those four policies were created by hand in the dashboard and they are NOT
-- redundant: migration 008's folder-scoped upload policies key the first path
-- segment on auth.uid() (the Supabase UUID), while the app uploads to
-- ${lineUserId}/... paths through the RLS-bound server client
-- (src/app/api/upload/signed-url/route.ts) — 008's WITH CHECK never matches,
-- so these bucket-wide dashboard policies are what actually authorize uploads
-- in production today. Dropping them would break portfolio/inquiry uploads
-- (staging == prod DB).
--
-- Resolution: CODIFY the live policies verbatim (definitions read from
-- pg_policies) so migrations match reality with ZERO behavior change, and
-- enable pg_net to align with the platform/local default. Tightening uploads
-- to proper line-user folder scoping is deferred to its own ticket — it needs
-- signed-upload PUT-context validation (whether the upload-time JWT carries
-- user_metadata.line_user_id) that belongs behind the e2e harness, not inside
-- a drift reconciliation.

-- Codify the dashboard-made policies (drop+create = idempotent, verbatim).
DROP POLICY IF EXISTS "Anyone can read portfolio" ON storage.objects;
CREATE POLICY "Anyone can read portfolio" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "Authenticated can read own inquiries" ON storage.objects;
CREATE POLICY "Authenticated can read own inquiries" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inquiries');

DROP POLICY IF EXISTS "Authenticated can upload inquiries" ON storage.objects;
CREATE POLICY "Authenticated can upload inquiries" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inquiries');

DROP POLICY IF EXISTS "Authenticated can upload portfolio" ON storage.objects;
CREATE POLICY "Authenticated can upload portfolio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

CREATE EXTENSION IF NOT EXISTS pg_net;

-- downgrade():
--   drop extension if exists pg_net;
--   drop policy if exists "Anyone can read portfolio" on storage.objects;
--   drop policy if exists "Authenticated can read own inquiries" on storage.objects;
--   drop policy if exists "Authenticated can upload inquiries" on storage.objects;
--   drop policy if exists "Authenticated can upload portfolio" on storage.objects;
--   (NOTE: do not run the policy drops against the live DB unless uploads have
--    been migrated off these policies — they are load-bearing, see header.)
