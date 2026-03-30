-- Fix quote_requests RLS policies: migration 007 used auth.jwt()->>'sub' (Supabase UUID)
-- instead of current_line_user_id() (LINE user ID). consumer_line_id stores LINE user IDs.

-- Consumer can read own quote requests
DROP POLICY IF EXISTS "consumer_read_own_quote_requests" ON quote_requests;
CREATE POLICY "consumer_read_own_quote_requests" ON quote_requests
  FOR SELECT USING (consumer_line_id = current_line_user_id());

-- Consumer can create quote requests
DROP POLICY IF EXISTS "consumer_create_quote_requests" ON quote_requests;
CREATE POLICY "consumer_create_quote_requests" ON quote_requests
  FOR INSERT WITH CHECK (consumer_line_id = current_line_user_id());

-- Artists can read quote requests linked to their inquiries
DROP POLICY IF EXISTS "artist_read_linked_quote_requests" ON quote_requests;
CREATE POLICY "artist_read_linked_quote_requests" ON quote_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inquiries i
      JOIN artists a ON i.artist_id = a.id
      WHERE i.quote_request_id = quote_requests.id
        AND a.line_user_id = current_line_user_id()
    )
  );
