-- Chat messages (one inquiry = one conversation)
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('consumer', 'artist', 'system')),
  sender_id     TEXT,  -- line_user_id, NULL for system messages
  message_type  TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'quote', 'system')),
  content       TEXT,  -- text content or image URL
  metadata      JSONB DEFAULT '{}',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_inquiry ON messages(inquiry_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(inquiry_id, created_at);
CREATE INDEX idx_messages_unread ON messages(inquiry_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Consumer can read/write messages in their own inquiries
CREATE POLICY "Consumer can read own inquiry messages" ON messages
  FOR SELECT USING (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Consumer can send messages to own inquiries" ON messages
  FOR INSERT WITH CHECK (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
    AND sender_type = 'consumer'
    AND sender_id = auth.jwt()->>'sub'
  );

-- Artist can read/write messages in inquiries they received
CREATE POLICY "Artist can read received inquiry messages" ON messages
  FOR SELECT USING (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Artist can send messages to received inquiries" ON messages
  FOR INSERT WITH CHECK (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
    AND sender_type = 'artist'
    AND sender_id = auth.jwt()->>'sub'
  );

-- Allow participants to mark messages as read
CREATE POLICY "Consumer can mark messages read in own inquiries" ON messages
  FOR UPDATE USING (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  ) WITH CHECK (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Artist can mark messages read in received inquiries" ON messages
  FOR UPDATE USING (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  ) WITH CHECK (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  );

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
