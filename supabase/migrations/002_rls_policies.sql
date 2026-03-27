-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Styles: public read
CREATE POLICY "Anyone can read styles" ON styles FOR SELECT USING (true);

-- Artists: public read active, owner can update own
CREATE POLICY "Anyone can read active artists" ON artists FOR SELECT USING (status = 'active' OR status = 'pending');
CREATE POLICY "Artist can update own profile" ON artists FOR UPDATE USING (line_user_id = auth.jwt()->>'sub');
CREATE POLICY "Authenticated users can insert artists" ON artists FOR INSERT WITH CHECK (true);

-- Artist styles: public read, artist can manage own
CREATE POLICY "Anyone can read artist styles" ON artist_styles FOR SELECT USING (true);
CREATE POLICY "Artist can manage own styles" ON artist_styles FOR ALL USING (
  artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->>'sub')
);

-- Portfolio: public read for active artists, artist can manage own
CREATE POLICY "Anyone can read portfolio of active artists" ON portfolio_items FOR SELECT USING (
  artist_id IN (SELECT id FROM artists WHERE status = 'active')
);
CREATE POLICY "Artist can manage own portfolio" ON portfolio_items FOR ALL USING (
  artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->>'sub')
);

-- Inquiries: consumer can read own sent, artist can read received
CREATE POLICY "Consumer can read own inquiries" ON inquiries FOR SELECT USING (consumer_line_id = auth.jwt()->>'sub');
CREATE POLICY "Artist can read received inquiries" ON inquiries FOR SELECT USING (
  artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->>'sub')
);
CREATE POLICY "Authenticated can create inquiries" ON inquiries FOR INSERT WITH CHECK (true);

-- Quotes: linked artist can manage, consumer can read
CREATE POLICY "Artist can manage own quotes" ON quotes FOR ALL USING (
  artist_id IN (SELECT id FROM artists WHERE line_user_id = auth.jwt()->>'sub')
);
CREATE POLICY "Consumer can read quotes for own inquiries" ON quotes FOR SELECT USING (
  inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
);

-- Reviews: public read, authenticated write
CREATE POLICY "Anyone can read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated can create reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Favorites: user can manage own
CREATE POLICY "User can manage own favorites" ON favorites FOR ALL USING (consumer_line_id = auth.jwt()->>'sub');
