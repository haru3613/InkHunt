-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tattoo styles (lookup table)
CREATE TABLE styles (
  id    SERIAL PRIMARY KEY,
  slug  TEXT UNIQUE NOT NULL,
  name  TEXT NOT NULL,
  icon  TEXT
);

-- Tattoo artists
CREATE TABLE artists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  bio             TEXT,
  avatar_url      TEXT,
  ig_handle       TEXT,
  line_user_id    TEXT UNIQUE,
  city            TEXT NOT NULL,
  district        TEXT,
  address         TEXT,
  lat             DECIMAL(10, 7),
  lng             DECIMAL(10, 7),
  price_min       INTEGER,
  price_max       INTEGER,
  pricing_note    TEXT,
  deposit_amount  INTEGER,
  booking_notice  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  is_claimed      BOOLEAN NOT NULL DEFAULT true,
  featured        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Artist-style many-to-many
CREATE TABLE artist_styles (
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  style_id  INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  PRIMARY KEY (artist_id, style_id)
);

-- Portfolio items
CREATE TABLE portfolio_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  title           TEXT,
  description     TEXT,
  body_part       TEXT,
  size_cm         TEXT,
  style_id        INTEGER REFERENCES styles(id),
  healed_image_url TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consumer inquiries (directed to specific artist)
CREATE TABLE inquiries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES artists(id),
  consumer_line_id  TEXT NOT NULL,
  consumer_name     TEXT,
  description       TEXT NOT NULL,
  reference_images  JSONB NOT NULL DEFAULT '[]',
  body_part         TEXT,
  size_estimate     TEXT,
  budget_min        INTEGER,
  budget_max        INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Artist quotes (response to inquiry)
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id      UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  artist_id       UUID NOT NULL REFERENCES artists(id),
  price           INTEGER NOT NULL,
  note            TEXT,
  available_dates TEXT,
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'accepted', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id             UUID NOT NULL REFERENCES artists(id),
  consumer_line_id      TEXT NOT NULL,
  consumer_name         TEXT,
  rating_skill          SMALLINT NOT NULL CHECK (rating_skill BETWEEN 1 AND 5),
  rating_communication  SMALLINT NOT NULL CHECK (rating_communication BETWEEN 1 AND 5),
  rating_environment    SMALLINT NOT NULL CHECK (rating_environment BETWEEN 1 AND 5),
  rating_value          SMALLINT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
  comment               TEXT,
  photo_urls            JSONB NOT NULL DEFAULT '[]',
  verified              BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favorites
CREATE TABLE favorites (
  consumer_line_id TEXT NOT NULL,
  artist_id        UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_line_id, artist_id)
);

-- Indexes
CREATE INDEX idx_artists_status ON artists(status);
CREATE INDEX idx_artists_city ON artists(city);
CREATE INDEX idx_artists_featured ON artists(featured) WHERE featured = true;
CREATE INDEX idx_artists_line_user_id ON artists(line_user_id);
CREATE INDEX idx_portfolio_items_artist ON portfolio_items(artist_id);
CREATE INDEX idx_portfolio_items_style ON portfolio_items(style_id);
CREATE INDEX idx_inquiries_artist ON inquiries(artist_id);
CREATE INDEX idx_inquiries_consumer ON inquiries(consumer_line_id);
CREATE INDEX idx_quotes_inquiry ON quotes(inquiry_id);
CREATE INDEX idx_reviews_artist ON reviews(artist_id);
CREATE INDEX idx_favorites_consumer ON favorites(consumer_line_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
