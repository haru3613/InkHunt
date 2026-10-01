\set ON_ERROR_STOP on

-- Run against the isolated local database only:
-- psql postgres://postgres:postgres@127.0.0.1:56322/postgres \
--   -f supabase/tests/019_transactional_inquiries_quotes.sql
-- Every fixture is wrapped in a transaction and rolled back.

BEGIN;

DO $$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.create_inquiry_transaction(text,text,uuid,text,jsonb,text,text,integer,integer,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon can execute create_inquiry_transaction';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.respond_to_quote_transaction(uuid,uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated can execute respond_to_quote_transaction';
  END IF;
END;
$$;

INSERT INTO public.artists (
  id, slug, display_name, city, line_user_id, status
)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'rpc-active-artist', 'RPC Active', '台北市', 'U-rpc-artist', 'active'),
  ('91000000-0000-0000-0000-000000000002', 'rpc-pending-artist', 'RPC Pending', '台北市', 'U-rpc-pending', 'pending'),
  ('91000000-0000-0000-0000-000000000003', 'rpc-self-artist', 'RPC Self', '台北市', 'U-rpc-self', 'active');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.artists (
      id, slug, display_name, city, line_user_id, status
    ) VALUES (
      '91000000-0000-0000-0000-000000000004',
      'rpc-duplicate-artist',
      'RPC Duplicate',
      '台北市',
      'U-rpc-artist',
      'active'
    );
    RAISE EXCEPTION 'duplicate non-null line_user_id was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    PERFORM public.create_inquiry_transaction(
      'U-consumer', 'Consumer',
      '91000000-0000-0000-0000-000000000002',
      'inactive target must be rejected', '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, 'inactive target'
    );
    RAISE EXCEPTION 'pending artist accepted an inquiry';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_ARTIST_NOT_ACTIVE' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_inquiry_transaction(
      'U-rpc-self', 'Self',
      '91000000-0000-0000-0000-000000000003',
      'self inquiry must be rejected', '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, 'self inquiry'
    );
    RAISE EXCEPTION 'self inquiry was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_SELF_INQUIRY' THEN RAISE; END IF;
  END;
END;
$$;

CREATE TEMP TABLE rpc_test_state (
  name text PRIMARY KEY,
  id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO rpc_test_state (name, id)
SELECT
  'accepted_inquiry',
  (result->'inquiry'->>'id')::uuid
FROM (
  SELECT public.create_inquiry_transaction(
    'U-consumer',
    'Consumer',
    '91000000-0000-0000-0000-000000000001',
    'successful inquiry transaction fixture',
    '["/api/media/inquiries/auth-user/ref.jpg"]'::jsonb,
    '前臂',
    '5 cm',
    3000,
    6000,
    '3k_8k',
    '新詢價'
  ) AS result
) AS created;

INSERT INTO rpc_test_state (name, id)
SELECT
  'accepted_quote',
  (result->'quote'->>'id')::uuid
FROM (
  SELECT public.create_quote_transaction(
    (SELECT id FROM rpc_test_state WHERE name = 'accepted_inquiry'),
    '91000000-0000-0000-0000-000000000001',
    'U-rpc-artist',
    5000,
    'quote fixture',
    '2026-10-08',
    '["2026-10-08"]'::jsonb,
    '報價 NT$5,000'
  ) AS result
) AS created;

DO $$
DECLARE
  v_inquiry_id uuid := (SELECT id FROM rpc_test_state WHERE name = 'accepted_inquiry');
  v_quote_id uuid := (SELECT id FROM rpc_test_state WHERE name = 'accepted_quote');
BEGIN
  IF (SELECT inquiry_row.status FROM public.inquiries AS inquiry_row WHERE inquiry_row.id = v_inquiry_id) <> 'quoted' THEN
    RAISE EXCEPTION 'create_quote_transaction did not set inquiry quoted';
  END IF;
  IF (
    SELECT count(*)
    FROM public.messages AS message_row
    WHERE message_row.inquiry_id = v_inquiry_id
  ) <> 3 THEN
    RAISE EXCEPTION 'inquiry + image + quote messages were not committed atomically';
  END IF;

  PERFORM public.respond_to_quote_transaction(
    v_quote_id, v_inquiry_id, 'U-consumer', 'accepted'
  );

  IF (SELECT inquiry_row.status FROM public.inquiries AS inquiry_row WHERE inquiry_row.id = v_inquiry_id) <> 'accepted' THEN
    RAISE EXCEPTION 'accepted quote did not transition inquiry';
  END IF;

  BEGIN
    PERFORM public.respond_to_quote_transaction(
      v_quote_id, v_inquiry_id, 'U-consumer', 'accepted'
    );
    RAISE EXCEPTION 'a quote was accepted twice';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_INQUIRY_NOT_OPEN' THEN RAISE; END IF;
  END;
END;
$$;

INSERT INTO rpc_test_state (name, id)
SELECT
  'closed_inquiry',
  (result->'inquiry'->>'id')::uuid
FROM (
  SELECT public.create_inquiry_transaction(
    'U-consumer', 'Consumer',
    '91000000-0000-0000-0000-000000000001',
    'closed inquiry fixture', '[]'::jsonb,
    NULL, NULL, NULL, NULL, NULL, '新詢價'
  ) AS result
) AS created;

INSERT INTO rpc_test_state (name, id)
SELECT
  'closed_quote',
  (result->'quote'->>'id')::uuid
FROM (
  SELECT public.create_quote_transaction(
    (SELECT id FROM rpc_test_state WHERE name = 'closed_inquiry'),
    '91000000-0000-0000-0000-000000000001',
    'U-rpc-artist',
    6000,
    NULL,
    NULL,
    NULL,
    '報價 NT$6,000'
  ) AS result
) AS created;

DO $$
DECLARE
  v_inquiry_id uuid := (SELECT id FROM rpc_test_state WHERE name = 'closed_inquiry');
  v_quote_id uuid := (SELECT id FROM rpc_test_state WHERE name = 'closed_quote');
BEGIN
  PERFORM public.close_inquiry_transaction(v_inquiry_id, 'U-consumer');

  BEGIN
    PERFORM public.respond_to_quote_transaction(
      v_quote_id, v_inquiry_id, 'U-consumer', 'accepted'
    );
    RAISE EXCEPTION 'closed inquiry was resurrected by quote acceptance';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_INQUIRY_NOT_OPEN' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_quote_transaction(
      v_inquiry_id,
      '91000000-0000-0000-0000-000000000001',
      'U-rpc-artist',
      7000,
      NULL,
      NULL,
      NULL,
      '報價 NT$7,000'
    );
    RAISE EXCEPTION 'new quote was created after inquiry closed';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'INKHUNT_INQUIRY_NOT_OPEN' THEN RAISE; END IF;
  END;
END;
$$;

-- Force the second write in create_inquiry_transaction to fail. Catching the
-- function exception creates a PL/pgSQL subtransaction, then the assertion
-- proves the inquiry insert rolled back with its message insert.
CREATE FUNCTION pg_temp.reject_rollback_sentinel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content = 'ROLLBACK_SENTINEL' THEN
    RAISE EXCEPTION 'forced message failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rpc_test_reject_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION pg_temp.reject_rollback_sentinel();

DO $$
BEGIN
  BEGIN
    PERFORM public.create_inquiry_transaction(
      'U-consumer', 'Consumer',
      '91000000-0000-0000-0000-000000000001',
      'rollback fixture must not persist', '[]'::jsonb,
      NULL, NULL, NULL, NULL, NULL, 'ROLLBACK_SENTINEL'
    );
    RAISE EXCEPTION 'forced message failure did not abort the RPC';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'forced message failure' THEN RAISE; END IF;
  END;

  IF EXISTS (
    SELECT 1
    FROM public.inquiries
    WHERE description = 'rollback fixture must not persist'
  ) THEN
    RAISE EXCEPTION 'failed inquiry transaction left a partial inquiry row';
  END IF;
END;
$$;

ROLLBACK;

\echo '019 transactional inquiry/quote integration assertions passed'
