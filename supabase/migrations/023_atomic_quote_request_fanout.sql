-- Keep the legacy multi-artist endpoint available without allowing partial
-- fanout or more than one accepted quote in the same comparison group.

CREATE OR REPLACE FUNCTION public.create_quote_request_transaction(
  p_consumer_line_id text,
  p_consumer_name text,
  p_artist_ids uuid[],
  p_description text,
  p_reference_images jsonb,
  p_body_part text,
  p_size_estimate text,
  p_budget_min integer,
  p_budget_max integer,
  p_summary_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  created_request public.quote_requests%ROWTYPE;
  child_result jsonb;
  child_inquiry_id uuid;
  created_inquiries jsonb := '[]'::jsonb;
  artist_id uuid;
BEGIN
  IF cardinality(p_artist_ids) NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'INKHUNT_INVALID_ARTIST_COUNT' USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(DISTINCT selected_artist_id)
    FROM unnest(p_artist_ids) AS selected(selected_artist_id)
  ) <> cardinality(p_artist_ids) THEN
    RAISE EXCEPTION 'INKHUNT_DUPLICATE_ARTIST' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(coalesce(p_reference_images, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'INKHUNT_INVALID_REFERENCE_IMAGES' USING ERRCODE = '22023';
  END IF;

  -- Lock every existing target in deterministic UUID order. The delegated
  -- single-inquiry function locks each row again (re-entrant) while checking
  -- active/self eligibility. A missing or invalid target raises there and
  -- rolls back the parent plus every earlier child.
  PERFORM 1
  FROM public.artists AS target_artist
  WHERE target_artist.id = ANY(p_artist_ids)
  ORDER BY target_artist.id
  FOR UPDATE;

  INSERT INTO public.quote_requests (
    consumer_line_id,
    consumer_name,
    description,
    reference_images,
    body_part,
    size_estimate,
    budget_min,
    budget_max
  )
  VALUES (
    p_consumer_line_id,
    p_consumer_name,
    p_description,
    coalesce(p_reference_images, '[]'::jsonb),
    p_body_part,
    p_size_estimate,
    p_budget_min,
    p_budget_max
  )
  RETURNING * INTO created_request;

  FOREACH artist_id IN ARRAY p_artist_ids LOOP
    child_result := public.create_inquiry_transaction(
      p_consumer_line_id,
      p_consumer_name,
      artist_id,
      p_description,
      coalesce(p_reference_images, '[]'::jsonb),
      p_body_part,
      p_size_estimate,
      p_budget_min,
      p_budget_max,
      NULL,
      p_summary_content
    );

    child_inquiry_id := (child_result->'inquiry'->>'id')::uuid;

    UPDATE public.inquiries
    SET quote_request_id = created_request.id
    WHERE id = child_inquiry_id;

    created_inquiries := created_inquiries || jsonb_build_array(child_result->'inquiry');
  END LOOP;

  RETURN jsonb_build_object(
    'quoteRequest', to_jsonb(created_request),
    'inquiries', created_inquiries
  );
END;
$$;

-- Quote creation for a comparison-group inquiry also locks and validates the
-- parent before the child. This shares the parent-first serialization point
-- used by acceptance below.
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
  target_request public.quote_requests%ROWTYPE;
  target_inquiry public.inquiries%ROWTYPE;
  parent_request_id uuid;
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

  SELECT quote_request_id
  INTO parent_request_id
  FROM public.inquiries
  WHERE id = p_inquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF parent_request_id IS NOT NULL THEN
    SELECT *
    INTO target_request
    FROM public.quote_requests
    WHERE id = parent_request_id
    FOR UPDATE;

    IF NOT FOUND OR target_request.status IN ('accepted', 'closed') THEN
      RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.inquiries AS grouped_inquiry
      LEFT JOIN public.quotes AS grouped_quote
        ON grouped_quote.inquiry_id = grouped_inquiry.id
      WHERE grouped_inquiry.quote_request_id = parent_request_id
        AND (
          grouped_inquiry.status = 'accepted'
          OR grouped_quote.status = 'accepted'
        )
    ) THEN
      RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO target_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF target_inquiry.artist_id <> p_artist_id THEN
    RAISE EXCEPTION 'INKHUNT_QUOTE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF target_inquiry.status NOT IN ('pending', 'quoted') THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.quotes (
    inquiry_id, artist_id, price, note, available_dates
  )
  VALUES (
    p_inquiry_id, p_artist_id, p_price, p_note, p_available_dates
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

  IF parent_request_id IS NOT NULL THEN
    UPDATE public.quote_requests
    SET status = 'quoted'
    WHERE id = parent_request_id;
  END IF;

  RETURN jsonb_build_object(
    'quote', to_jsonb(created_quote),
    'message', to_jsonb(created_message)
  );
END;
$$;

-- Serialize comparison-group acceptance on quote_requests before locking an
-- inquiry. Accepting one quote rejects every other open quote, closes every
-- sibling inquiry, and marks the parent accepted in the same transaction.
-- Single-artist inquiries keep the 019 behavior.
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
  target_request public.quote_requests%ROWTYPE;
  target_inquiry public.inquiries%ROWTYPE;
  target_quote public.quotes%ROWTYPE;
  parent_request_id uuid;
BEGIN
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'INKHUNT_INVALID_QUOTE_STATUS' USING ERRCODE = '22023';
  END IF;

  SELECT quote_request_id
  INTO parent_request_id
  FROM public.inquiries
  WHERE id = p_inquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF parent_request_id IS NOT NULL THEN
    SELECT *
    INTO target_request
    FROM public.quote_requests
    WHERE id = parent_request_id
    FOR UPDATE;

    IF NOT FOUND OR target_request.status IN ('accepted', 'closed') THEN
      RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.inquiries AS grouped_inquiry
      LEFT JOIN public.quotes AS grouped_quote
        ON grouped_quote.inquiry_id = grouped_inquiry.id
      WHERE grouped_inquiry.quote_request_id = parent_request_id
        AND grouped_inquiry.id <> p_inquiry_id
        AND (
          grouped_inquiry.status = 'accepted'
          OR grouped_quote.status = 'accepted'
        )
    ) THEN
      RAISE EXCEPTION 'INKHUNT_INQUIRY_NOT_OPEN' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO target_inquiry
  FROM public.inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

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
    IF parent_request_id IS NULL THEN
      UPDATE public.quotes
      SET status = 'rejected'
      WHERE inquiry_id = p_inquiry_id
        AND id <> target_quote.id
        AND status IN ('sent', 'viewed');

      UPDATE public.inquiries
      SET status = 'accepted'
      WHERE id = p_inquiry_id;
    ELSE
      UPDATE public.quotes AS sibling_quote
      SET status = 'rejected'
      FROM public.inquiries AS sibling_inquiry
      WHERE sibling_quote.inquiry_id = sibling_inquiry.id
        AND sibling_inquiry.quote_request_id = parent_request_id
        AND sibling_quote.id <> target_quote.id
        AND sibling_quote.status IN ('sent', 'viewed');

      UPDATE public.inquiries
      SET status = 'closed'
      WHERE quote_request_id = parent_request_id
        AND id <> p_inquiry_id
        AND status <> 'closed';

      UPDATE public.inquiries
      SET status = 'accepted'
      WHERE id = p_inquiry_id;

      UPDATE public.quote_requests
      SET status = 'accepted'
      WHERE id = parent_request_id;
    END IF;
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

REVOKE ALL ON FUNCTION public.create_quote_request_transaction(
  text, text, uuid[], text, jsonb, text, text, integer, integer, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_quote_transaction(
  uuid, uuid, text, integer, text, text, jsonb, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_quote_transaction(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_quote_request_transaction(
  text, text, uuid[], text, jsonb, text, text, integer, integer, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_quote_transaction(
  uuid, uuid, text, integer, text, text, jsonb, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_quote_transaction(
  uuid, uuid, text, text
) TO service_role;
