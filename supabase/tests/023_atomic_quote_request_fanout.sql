\set ON_ERROR_STOP on

-- Run against the isolated local database only:
-- psql postgres://postgres:postgres@127.0.0.1:56322/postgres \
--   -f supabase/tests/023_atomic_quote_request_fanout.sql

BEGIN;

INSERT INTO public.artists (
  id, slug, display_name, city, line_user_id, status
)
VALUES
  ('93000000-0000-0000-0000-000000000001', 'fanout-active-one', 'Fanout One', '台北市', 'U-fanout-one', 'active'),
  ('93000000-0000-0000-0000-000000000002', 'fanout-active-two', 'Fanout Two', '台北市', 'U-fanout-two', 'active'),
  ('93000000-0000-0000-0000-000000000003', 'fanout-pending', 'Fanout Pending', '台北市', 'U-fanout-pending', 'pending');

DO $$
BEGIN
  BEGIN
    PERFORM public.create_quote_request_transaction(
      'U-fanout-consumer', 'Fanout Consumer',
      ARRAY[
        '93000000-0000-0000-0000-000000000001'::uuid,
        '93000000-0000-0000-0000-000000000001'::uuid
      ],
      'duplicate target fanout fixture', '[]'::jsonb,
      '前臂', '5 cm', 3000, 6000, '新詢價'
    );
    RAISE EXCEPTION 'duplicate artists were accepted';
  EXCEPTION
    WHEN invalid_parameter_value THEN
      IF SQLERRM <> 'INKHUNT_DUPLICATE_ARTIST' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_quote_request_transaction(
      'U-fanout-consumer', 'Fanout Consumer',
      ARRAY[
        '93000000-0000-0000-0000-000000000001'::uuid,
        '93000000-0000-0000-0000-000000000003'::uuid
      ],
      'invalid target must roll back whole fanout', '[]'::jsonb,
      '前臂', '5 cm', 3000, 6000, '新詢價'
    );
    RAISE EXCEPTION 'pending artist fanout was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_ARTIST_NOT_ACTIVE' THEN RAISE; END IF;
  END;

  IF EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE description = 'invalid target must roll back whole fanout'
  ) OR EXISTS (
    SELECT 1 FROM public.inquiries
    WHERE description = 'invalid target must roll back whole fanout'
  ) THEN
    RAISE EXCEPTION 'failed fanout left a partial parent or child';
  END IF;
END;
$$;

CREATE TEMP TABLE fanout_test_state (
  name text PRIMARY KEY,
  id uuid NOT NULL
) ON COMMIT DROP;

WITH created AS (
  SELECT public.create_quote_request_transaction(
    'U-fanout-consumer',
    'Fanout Consumer',
    ARRAY[
      '93000000-0000-0000-0000-000000000001'::uuid,
      '93000000-0000-0000-0000-000000000002'::uuid
    ],
    'successful atomic fanout fixture',
    '[]'::jsonb,
    '前臂',
    '5 cm',
    3000,
    6000,
    '新詢價'
  ) AS result
)
INSERT INTO fanout_test_state (name, id)
SELECT 'quote_request', (result->'quoteRequest'->>'id')::uuid FROM created
UNION ALL
SELECT 'inquiry_one', (result->'inquiries'->0->>'id')::uuid FROM created
UNION ALL
SELECT 'inquiry_two', (result->'inquiries'->1->>'id')::uuid FROM created;

INSERT INTO fanout_test_state (name, id)
SELECT 'quote_one', (result->'quote'->>'id')::uuid
FROM (
  SELECT public.create_quote_transaction(
    (SELECT id FROM fanout_test_state WHERE name = 'inquiry_one'),
    '93000000-0000-0000-0000-000000000001',
    'U-fanout-one',
    5000, NULL, NULL, NULL, '報價 NT$5,000'
  ) AS result
) AS created;

INSERT INTO fanout_test_state (name, id)
SELECT 'quote_two', (result->'quote'->>'id')::uuid
FROM (
  SELECT public.create_quote_transaction(
    (SELECT id FROM fanout_test_state WHERE name = 'inquiry_two'),
    '93000000-0000-0000-0000-000000000002',
    'U-fanout-two',
    6000, NULL, NULL, NULL, '報價 NT$6,000'
  ) AS result
) AS created;

DO $$
DECLARE
  v_request_id uuid := (SELECT id FROM fanout_test_state WHERE name = 'quote_request');
  v_inquiry_one uuid := (SELECT id FROM fanout_test_state WHERE name = 'inquiry_one');
  v_inquiry_two uuid := (SELECT id FROM fanout_test_state WHERE name = 'inquiry_two');
  v_quote_one uuid := (SELECT id FROM fanout_test_state WHERE name = 'quote_one');
  v_quote_two uuid := (SELECT id FROM fanout_test_state WHERE name = 'quote_two');
BEGIN
  IF (SELECT count(*) FROM public.inquiries WHERE quote_request_id = v_request_id) <> 2 THEN
    RAISE EXCEPTION 'fanout did not atomically create and link both inquiries';
  END IF;

  IF (SELECT status FROM public.quote_requests WHERE id = v_request_id) <> 'quoted' THEN
    RAISE EXCEPTION 'group was not moved to quoted after quotes arrived';
  END IF;

  PERFORM public.respond_to_quote_transaction(
    v_quote_one, v_inquiry_one, 'U-fanout-consumer', 'accepted'
  );

  IF (SELECT status FROM public.quote_requests WHERE id = v_request_id) <> 'accepted'
     OR (SELECT status FROM public.inquiries WHERE id = v_inquiry_one) <> 'accepted'
     OR (SELECT status FROM public.inquiries WHERE id = v_inquiry_two) <> 'closed'
     OR (SELECT status FROM public.quotes WHERE id = v_quote_one) <> 'accepted'
     OR (SELECT status FROM public.quotes WHERE id = v_quote_two) <> 'rejected' THEN
    RAISE EXCEPTION 'group acceptance did not accept one and close/reject siblings';
  END IF;

  BEGIN
    PERFORM public.respond_to_quote_transaction(
      v_quote_two, v_inquiry_two, 'U-fanout-consumer', 'accepted'
    );
    RAISE EXCEPTION 'a second quote in the same group was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_INQUIRY_NOT_OPEN' THEN RAISE; END IF;
  END;

  IF (
    SELECT count(*)
    FROM public.inquiries
    WHERE quote_request_id = v_request_id
      AND status = 'accepted'
  ) <> 1 THEN
    RAISE EXCEPTION 'group has other than one accepted inquiry';
  END IF;
END;
$$;

ROLLBACK;

\echo '023 atomic quote-request fanout assertions passed'
