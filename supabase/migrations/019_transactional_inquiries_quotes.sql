-- Production hardening for the inquiry / quote state machine.
--
-- These functions are deliberately callable only by service_role. The API
-- supplies the authenticated LINE identity; the database verifies ownership,
-- eligibility, and state again while holding row locks. Each function also
-- writes its associated messages in the same transaction as the domain row.

-- Refuse to paper over legacy duplicate identities. The migration must stop
-- and let an operator resolve them intentionally before uniqueness is added.
DO $$
DECLARE
  duplicate_group_count integer;
BEGIN
  SELECT count(*)
  INTO duplicate_group_count
  FROM (
    SELECT line_user_id
    FROM public.artists
    WHERE line_user_id IS NOT NULL
    GROUP BY line_user_id
    HAVING count(*) > 1
  ) AS duplicate_groups;

  IF duplicate_group_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce artist LINE identity uniqueness: % duplicate non-null identity group(s) require manual resolution',
      duplicate_group_count
      USING ERRCODE = '23505';
  END IF;
END;
$$;

CREATE UNIQUE INDEX artists_line_user_id_unique_nonnull_idx
  ON public.artists (line_user_id)
  WHERE line_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_inquiry_transaction(
  p_consumer_line_id text,
  p_consumer_name text,
  p_artist_id uuid,
  p_description text,
  p_reference_images jsonb,
  p_body_part text,
  p_size_estimate text,
  p_budget_min integer,
  p_budget_max integer,
  p_budget_range text,
  p_summary_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_artist public.artists%ROWTYPE;
  created_inquiry public.inquiries%ROWTYPE;
  created_messages jsonb;
BEGIN
  SELECT *
  INTO target_artist
  FROM public.artists
  WHERE id = p_artist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_ARTIST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF target_artist.status <> 'active' THEN
    RAISE EXCEPTION 'INKHUNT_ARTIST_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  IF target_artist.line_user_id IS NOT NULL
     AND target_artist.line_user_id = p_consumer_line_id THEN
    RAISE EXCEPTION 'INKHUNT_SELF_INQUIRY' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(coalesce(p_reference_images, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'INKHUNT_INVALID_REFERENCE_IMAGES' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.inquiries (
    artist_id,
    consumer_line_id,
    consumer_name,
    description,
    reference_images,
    body_part,
    size_estimate,
    budget_min,
    budget_max,
    budget_range
  )
  VALUES (
    p_artist_id,
    p_consumer_line_id,
    p_consumer_name,
    p_description,
    coalesce(p_reference_images, '[]'::jsonb),
    p_body_part,
    p_size_estimate,
    p_budget_min,
    p_budget_max,
    p_budget_range
  )
  RETURNING * INTO created_inquiry;

  INSERT INTO public.messages (
    inquiry_id,
    sender_type,
    sender_id,
    message_type,
    content,
    metadata
  )
  VALUES (
    created_inquiry.id,
    'system',
    NULL,
    'system',
    p_summary_content,
    jsonb_build_object(
      'body_part', p_body_part,
      'size_estimate', p_size_estimate,
      'budget_min', p_budget_min,
      'budget_max', p_budget_max
    )
  );

  INSERT INTO public.messages (
    inquiry_id,
    sender_type,
    sender_id,
    message_type,
    content,
    metadata
  )
  SELECT
    created_inquiry.id,
    'consumer',
    p_consumer_line_id,
    'image',
    image_url,
    '{}'::jsonb
  FROM jsonb_array_elements_text(coalesce(p_reference_images, '[]'::jsonb))
    WITH ORDINALITY AS images(image_url, image_order)
  ORDER BY image_order;

  SELECT coalesce(jsonb_agg(to_jsonb(message_row) ORDER BY message_row.created_at, message_row.id), '[]'::jsonb)
  INTO created_messages
  FROM public.messages AS message_row
  WHERE message_row.inquiry_id = created_inquiry.id;

  RETURN jsonb_build_object(
    'inquiry', to_jsonb(created_inquiry),
    'messages', created_messages
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quote_transaction(
  p_inquiry_id uuid,
  p_artist_id uuid,
  p_sender_line_id text,
  p_price integer,
  p_note text,
  p_available_dates text,
  p_available_dates_json jsonb,
  p_message_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  quoting_artist public.artists%ROWTYPE;
  target_inquiry public.inquiries%ROWTYPE;
  created_quote public.quotes%ROWTYPE;
  created_message public.messages%ROWTYPE;
BEGIN
  SELECT *
  INTO quoting_artist
  FROM public.artists
  WHERE id = p_artist_id
  FOR UPDATE;

  IF NOT FOUND OR quoting_artist.line_user_id IS DISTINCT FROM p_sender_line_id THEN
    RAISE EXCEPTION 'INKHUNT_QUOTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF quoting_artist.status <> 'active' THEN
    RAISE EXCEPTION 'INKHUNT_ARTIST_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO target_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF target_inquiry.artist_id <> p_artist_id THEN
    RAISE EXCEPTION 'INKHUNT_QUOTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF target_inquiry.status NOT IN ('pending', 'quoted') THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.quotes (
    inquiry_id,
    artist_id,
    price,
    note,
    available_dates
  )
  VALUES (
    p_inquiry_id,
    p_artist_id,
    p_price,
    p_note,
    p_available_dates
  )
  RETURNING * INTO created_quote;

  INSERT INTO public.messages (
    inquiry_id,
    sender_type,
    sender_id,
    message_type,
    content,
    metadata
  )
  VALUES (
    p_inquiry_id,
    'artist',
    p_sender_line_id,
    'quote',
    p_message_content,
    jsonb_build_object(
      'quote_id', created_quote.id,
      'price', p_price,
      'note', p_note,
      'available_dates', p_available_dates_json,
      'status', 'sent'
    )
  )
  RETURNING * INTO created_message;

  UPDATE public.inquiries
  SET status = 'quoted'
  WHERE id = p_inquiry_id;

  RETURN jsonb_build_object(
    'quote', to_jsonb(created_quote),
    'message', to_jsonb(created_message)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_quote_transaction(
  p_quote_id uuid,
  p_inquiry_id uuid,
  p_consumer_line_id text,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_inquiry public.inquiries%ROWTYPE;
  target_quote public.quotes%ROWTYPE;
BEGIN
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'INKHUNT_INVALID_QUOTE_STATUS' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO target_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF target_inquiry.consumer_line_id <> p_consumer_line_id THEN
    RAISE EXCEPTION 'INKHUNT_QUOTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF target_inquiry.status IN ('accepted', 'closed') THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO target_quote
  FROM public.quotes
  WHERE id = p_quote_id
    AND inquiry_id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF target_quote.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'INKHUNT_QUOTE_NOT_ACTIONABLE' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.quotes
  SET status = p_status
  WHERE id = target_quote.id
  RETURNING * INTO target_quote;

  IF p_status = 'accepted' THEN
    UPDATE public.quotes
    SET status = 'rejected'
    WHERE inquiry_id = p_inquiry_id
      AND id <> target_quote.id
      AND status IN ('sent', 'viewed');

    UPDATE public.inquiries
    SET status = 'accepted'
    WHERE id = p_inquiry_id;
  END IF;

  INSERT INTO public.messages (
    inquiry_id,
    sender_type,
    sender_id,
    message_type,
    content,
    metadata
  )
  VALUES (
    p_inquiry_id,
    'system',
    NULL,
    'system',
    CASE p_status
      WHEN 'accepted' THEN '已接受報價'
      ELSE '已拒絕報價'
    END,
    '{}'::jsonb
  );

  RETURN to_jsonb(target_quote);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_inquiry_transaction(
  p_inquiry_id uuid,
  p_caller_line_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_inquiry public.inquiries%ROWTYPE;
BEGIN
  SELECT *
  INTO target_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF target_inquiry.consumer_line_id <> p_caller_line_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.artists
       WHERE id = target_inquiry.artist_id
         AND line_user_id = p_caller_line_id
     ) THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF target_inquiry.status <> 'closed' THEN
    UPDATE public.inquiries
    SET status = 'closed'
    WHERE id = p_inquiry_id
    RETURNING * INTO target_inquiry;
  END IF;

  RETURN to_jsonb(target_inquiry);
END;
$$;

REVOKE ALL ON FUNCTION public.create_inquiry_transaction(
  text, text, uuid, text, jsonb, text, text, integer, integer, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_quote_transaction(
  uuid, uuid, text, integer, text, text, jsonb, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_quote_transaction(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_inquiry_transaction(
  uuid, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_inquiry_transaction(
  text, text, uuid, text, jsonb, text, text, integer, integer, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_quote_transaction(
  uuid, uuid, text, integer, text, text, jsonb, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_quote_transaction(
  uuid, uuid, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_inquiry_transaction(
  uuid, text
) TO service_role;
