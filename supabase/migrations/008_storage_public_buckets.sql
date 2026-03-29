-- Ensure storage buckets exist and are publicly readable
-- Both portfolio and inquiries images need public read access
-- for Next.js Image component to display them without auth

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiries', 'inquiries', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Public read access for portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to inquiries" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own portfolio uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own inquiry uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own portfolio uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own inquiry uploads" ON storage.objects;

-- Public read access
CREATE POLICY "Public read access for portfolio" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Public read access for inquiries" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inquiries');

-- Upload: scoped to user's own folder (userId/filename pattern)
CREATE POLICY "Authenticated users can upload to portfolio" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can upload to inquiries" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inquiries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: scoped to user's own uploads
CREATE POLICY "Users can update own portfolio uploads" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own inquiry uploads" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inquiries' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'inquiries' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Delete: scoped to user's own uploads
CREATE POLICY "Users can delete own portfolio uploads" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own inquiry uploads" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'inquiries' AND (storage.foldername(name))[1] = auth.uid()::text);
