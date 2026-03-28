-- Multi-artist quote request system (strangler fig over existing inquiries)
-- Consumer picks 1-3 artists → one quote_request → N inquiries created

-- New table: consumer's original multi-artist request
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_line_id TEXT NOT NULL,
  consumer_name TEXT,
  description TEXT NOT NULL,
  reference_images JSONB NOT NULL DEFAULT '[]',
  body_part TEXT,
  size_estimate TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'quoting', 'quoted', 'accepted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link existing inquiries to a quote_request (nullable for backward compat)
ALTER TABLE inquiries ADD COLUMN quote_request_id UUID REFERENCES quote_requests(id);

-- Add quote_templates JSONB to artists table
ALTER TABLE artists ADD COLUMN quote_templates JSONB NOT NULL DEFAULT '[]';

-- Indexes
CREATE INDEX idx_quote_requests_consumer ON quote_requests(consumer_line_id);
CREATE INDEX idx_inquiries_quote_request ON inquiries(quote_request_id)
  WHERE quote_request_id IS NOT NULL;

-- RLS
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Consumer can read own quote requests
CREATE POLICY "consumer_read_own_quote_requests" ON quote_requests
  FOR SELECT USING (consumer_line_id = auth.jwt()->>'sub');

-- Consumer can create quote requests
CREATE POLICY "consumer_create_quote_requests" ON quote_requests
  FOR INSERT WITH CHECK (consumer_line_id = auth.jwt()->>'sub');

-- Artists can read quote requests linked to their inquiries
CREATE POLICY "artist_read_linked_quote_requests" ON quote_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inquiries i
      JOIN artists a ON i.artist_id = a.id
      WHERE i.quote_request_id = quote_requests.id
        AND a.line_user_id = auth.jwt()->>'sub'
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "service_role_all_quote_requests" ON quote_requests
  FOR ALL USING (auth.role() = 'service_role');
