-- Inquiry/reference images contain private customer conversations. Keep public
-- artist portfolio and avatar buckets unchanged, but make inquiry objects
-- private and enforce the same type/size limits as the upload API.
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'inquiries';

DROP POLICY IF EXISTS "Public read access for inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read own inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own inquiry uploads" ON storage.objects;

-- Direct Storage access is limited to an uploader's opaque Supabase Auth UID
-- folder. Inquiry participants read through /api/media/inquiries/*, which does
-- an application-level participant check before issuing a 60-second URL.
CREATE POLICY "Users can read own inquiry uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inquiries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can upload to inquiries" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inquiries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
