-- RLS limits rows, not columns. Replace Supabase's default table-wide SELECT
-- grants with explicit public projections so anon/authenticated REST clients
-- cannot request durable LINE identifiers or private studio/admin fields.

REVOKE SELECT ON TABLE public.artists FROM anon, authenticated;
GRANT SELECT (
  id,
  slug,
  display_name,
  bio,
  avatar_url,
  ig_handle,
  city,
  district,
  price_min,
  price_max,
  pricing_note,
  deposit_amount,
  booking_notice,
  status,
  is_claimed,
  featured,
  offers_coverup,
  offers_custom_design,
  has_flash_designs,
  created_at,
  updated_at
) ON TABLE public.artists TO anon, authenticated;

REVOKE SELECT ON TABLE public.reviews FROM anon, authenticated;
GRANT SELECT (
  id,
  artist_id,
  rating,
  comment,
  created_at
) ON TABLE public.reviews TO anon, authenticated;

-- The upload API now uses auth.uid() folders for every bucket. Remove the
-- drift-era bucket-wide portfolio INSERT fallback; migration 008's UID-scoped
-- policy remains in force. Existing LINE-folder objects stay publicly readable.
DROP POLICY IF EXISTS "Authenticated can upload portfolio" ON storage.objects;

-- Column-level privacy above intentionally prevents authenticated callers from
-- reading artists.line_user_id. Identity-aware RLS must therefore resolve the
-- caller's artist row under a tightly scoped definer function. It accepts no
-- caller-controlled parameters and derives both identities from the verified
-- request JWT.
CREATE OR REPLACE FUNCTION public.current_artist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id
  FROM public.artists AS a
  WHERE auth.uid() IS NOT NULL
    AND public.current_line_user_id() IS NOT NULL
    AND a.line_user_id = public.current_line_user_id()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_artist_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_artist_id() TO authenticated;

-- Migration 003 left six obsolete message policies that compare the Supabase
-- UUID (`sub`) with stored LINE IDs and, for artists, join the now-private
-- artists.line_user_id column as the invoking role. Remove all six and replace
-- them with participant policies based on the verified identity helpers.
DROP POLICY IF EXISTS "Consumer can read own inquiry messages" ON public.messages;
DROP POLICY IF EXISTS "Consumer can send messages to own inquiries" ON public.messages;
DROP POLICY IF EXISTS "Consumer can mark messages read in own inquiries" ON public.messages;
DROP POLICY IF EXISTS "Artist can read received inquiry messages" ON public.messages;
DROP POLICY IF EXISTS "Artist can send messages to received inquiries" ON public.messages;
DROP POLICY IF EXISTS "Artist can mark messages read in received inquiries" ON public.messages;
DROP POLICY IF EXISTS "Linked users can read messages" ON public.messages;

CREATE POLICY "Participants can read inquiry messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inquiries AS i
      WHERE i.id = messages.inquiry_id
        AND (
          i.consumer_line_id = public.current_line_user_id()
          OR i.artist_id = public.current_artist_id()
        )
    )
  );

CREATE POLICY "Participants can send inquiry messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    message_type IN ('text', 'image')
    AND (
      (
        sender_type = 'consumer'
        AND sender_id = public.current_line_user_id()
        AND EXISTS (
          SELECT 1 FROM public.inquiries AS i
          WHERE i.id = messages.inquiry_id
            AND i.consumer_line_id = public.current_line_user_id()
        )
      )
      OR
      (
        sender_type = 'artist'
        AND sender_id = public.current_line_user_id()
        AND EXISTS (
          SELECT 1 FROM public.inquiries AS i
          WHERE i.id = messages.inquiry_id
            AND i.artist_id = public.current_artist_id()
        )
      )
    )
  );

CREATE POLICY "Participants can mark inquiry messages read" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries AS i
      WHERE i.id = messages.inquiry_id
        AND (
          i.consumer_line_id = public.current_line_user_id()
          OR i.artist_id = public.current_artist_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inquiries AS i
      WHERE i.id = messages.inquiry_id
        AND (
          i.consumer_line_id = public.current_line_user_id()
          OR i.artist_id = public.current_artist_id()
        )
    )
  );

-- Direct authenticated clients need only normal chat inserts and read-state
-- updates. Service-role quote/system writes continue to bypass these grants.
REVOKE INSERT, UPDATE ON TABLE public.messages FROM anon, authenticated;
GRANT INSERT (
  inquiry_id,
  sender_type,
  sender_id,
  message_type,
  content
) ON TABLE public.messages TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.messages TO authenticated;

-- The legacy quote-request artist policy had the same invoker join against
-- artists.line_user_id. Compare its linked inquiry with current_artist_id().
DROP POLICY IF EXISTS "artist_read_linked_quote_requests" ON public.quote_requests;
CREATE POLICY "artist_read_linked_quote_requests" ON public.quote_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries AS i
      WHERE i.quote_request_id = quote_requests.id
        AND i.artist_id = public.current_artist_id()
    )
  );

-- Policies that call the authenticated-only definer function must not be
-- considered for anonymous public reads.
DROP POLICY IF EXISTS "Artist can manage own styles" ON public.artist_styles;
CREATE POLICY "Artist can manage own styles" ON public.artist_styles
  FOR ALL TO authenticated
  USING (artist_id = public.current_artist_id())
  WITH CHECK (artist_id = public.current_artist_id());

DROP POLICY IF EXISTS "Artist can manage own portfolio" ON public.portfolio_items;
CREATE POLICY "Artist can manage own portfolio" ON public.portfolio_items
  FOR ALL TO authenticated
  USING (artist_id = public.current_artist_id())
  WITH CHECK (artist_id = public.current_artist_id());

DROP POLICY IF EXISTS "Artist can read received inquiries" ON public.inquiries;
CREATE POLICY "Artist can read received inquiries" ON public.inquiries
  FOR SELECT TO authenticated
  USING (artist_id = public.current_artist_id());

DROP POLICY IF EXISTS "Artist can manage own quotes" ON public.quotes;
CREATE POLICY "Artist can manage own quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (artist_id = public.current_artist_id())
  WITH CHECK (artist_id = public.current_artist_id());
