-- Ensure storage buckets exist and are publicly readable
-- Both portfolio and inquiries images need public read access
-- for Next.js Image component to display them without auth

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiries', 'inquiries', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to both buckets
CREATE POLICY "Public read access for portfolio" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Public read access for inquiries" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inquiries');

-- Allow authenticated users to upload to portfolio (artists)
CREATE POLICY "Authenticated users can upload to portfolio" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

-- Allow authenticated users to upload to inquiries (consumers)
CREATE POLICY "Authenticated users can upload to inquiries" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inquiries');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own portfolio uploads" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own inquiry uploads" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'inquiries' AND (storage.foldername(name))[1] = auth.uid()::text);
