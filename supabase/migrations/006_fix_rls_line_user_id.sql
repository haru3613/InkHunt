-- Fix RLS policies: auth.jwt()->>'sub' returns the Supabase UUID,
-- not the LINE user ID. Use user_metadata->>'line_user_id' instead.

-- Artists: artist can update own profile
DROP POLICY IF EXISTS "Artist can update own profile" ON artists;
CREATE POLICY "Artist can update own profile" ON artists FOR UPDATE
  USING (line_user_id = auth.jwt()->'user_metadata'->>'line_user_id');

-- Artist styles: artist can manage own
DROP POLICY IF EXISTS "Artist can manage own styles" ON artist_styles;
CREATE POLICY "Artist can manage own styles" ON artist_styles FOR ALL
  USING (artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id'));

-- Portfolio: artist can manage own
DROP POLICY IF EXISTS "Artist can manage own portfolio" ON portfolio_items;
CREATE POLICY "Artist can manage own portfolio" ON portfolio_items FOR ALL
  USING (artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id'));

-- Inquiries: consumer can read own, artist can read received
DROP POLICY IF EXISTS "Consumer can read own inquiries" ON inquiries;
CREATE POLICY "Consumer can read own inquiries" ON inquiries FOR SELECT
  USING (consumer_line_id = auth.jwt()->'user_metadata'->>'line_user_id');

DROP POLICY IF EXISTS "Artist can read received inquiries" ON inquiries;
CREATE POLICY "Artist can read received inquiries" ON inquiries FOR SELECT
  USING (artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id'));

-- Quotes: artist can manage, consumer can read
DROP POLICY IF EXISTS "Artist can manage own quotes" ON quotes;
CREATE POLICY "Artist can manage own quotes" ON quotes FOR ALL
  USING (artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id'));

DROP POLICY IF EXISTS "Consumer can read quotes for own inquiries" ON quotes;
CREATE POLICY "Consumer can read quotes for own inquiries" ON quotes FOR SELECT
  USING (inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->'user_metadata'->>'line_user_id'));

-- Favorites: user can manage own
DROP POLICY IF EXISTS "User can manage own favorites" ON favorites;
CREATE POLICY "User can manage own favorites" ON favorites FOR ALL
  USING (consumer_line_id = auth.jwt()->'user_metadata'->>'line_user_id');

-- Messages: linked users can read/write
DROP POLICY IF EXISTS "Linked users can read messages" ON messages;
CREATE POLICY "Linked users can read messages" ON messages FOR SELECT
  USING (inquiry_id IN (
    SELECT id FROM inquiries WHERE
      consumer_line_id = auth.jwt()->'user_metadata'->>'line_user_id'
      OR artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id')
  ));

DROP POLICY IF EXISTS "Linked users can insert messages" ON messages;
CREATE POLICY "Linked users can insert messages" ON messages FOR INSERT
  WITH CHECK (inquiry_id IN (
    SELECT id FROM inquiries WHERE
      consumer_line_id = auth.jwt()->'user_metadata'->>'line_user_id'
      OR artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->'user_metadata'->>'line_user_id')
  ));
