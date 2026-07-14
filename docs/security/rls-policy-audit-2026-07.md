# RLS Policy Audit — HAR-661 (2026-07)

Audit of every finding in HAR-661 against the **live database** (pg_policies,
pg_proc, information_schema grants, Supabase security advisors), with the
decision taken for each. Fixes ship in `supabase/migrations/018_rls_hardening.sql`
plus code changes in `src/lib/auth/` and the two auth routes.

Context: all application writes go through the service-role admin client
(`src/lib/supabase/queries/*`), which bypasses RLS. The anon/authenticated
policies below were therefore unused by the app but directly exploitable by
anyone holding the public anon key (it ships in the browser bundle).

## Findings

### 1. `artists` INSERT — `WITH CHECK (true)` — CONFIRMED, fixed

Live policy `"Authenticated users can insert artists"` (roles `{public}`,
`with_check: true`): any logged-in user could insert arbitrary artist rows
via the anon-key client, bypassing the onboarding flow entirely.

**Decision:** drop the policy. Artist creation only happens through
`POST /api/artists` (service role), which validates and sets `status='pending'`.

### 2. `inquiries` INSERT — `WITH CHECK (true)` — CONFIRMED, fixed

Live policy `"Authenticated can create inquiries"` (`with_check: true`):
arbitrary inquiry rows could be inserted with any `consumer_line_id`,
i.e. inquiries forged on behalf of other users.

**Decision:** drop the policy. Inquiry creation goes through
`POST /api/inquiries` (service role) which stamps the authenticated user's ID.

### 3. `artists` SELECT exposing non-active profiles — ALREADY FIXED

Live policies are active-only + own-profile (migration 016 / HAR-544).

**Decision:** no change needed.

### 4. `artists` UPDATE — no column guard — CONFIRMED, fixed

Live policy `"Artist can update own profile"` has
`qual: line_user_id = current_line_user_id()` but `with_check: null` and no
column restriction: an artist could set `status='active'` (skip admin review)
or `featured=true` (self-promote) on their own row via the anon-key client.

**Decision:** RLS cannot restrict columns, and a column-level
`REVOKE UPDATE (status, featured)` would be a **no-op** — the Supabase default
table-level UPDATE grant covers all columns and is stored separately from
column ACLs (review finding). So the migration revokes the whole privilege:
`REVOKE UPDATE ON artists FROM anon, authenticated`. Verified all artist
writes go through the service-role admin client, so nothing legitimate loses
access. If a client-side write path is ever added, follow the
`011_reviews.sql` pattern (table-level REVOKE + column-level re-GRANT).

### 5. `messages` INSERT — permissive legacy policy — CONFIRMED, fixed

Live policy `"Linked users can insert messages"` only checks inquiry
membership and is OR-ed with the two strict sender-validated policies —
permissive policies combine with OR, so the strict ones were dead letters.
A consumer could insert messages with `sender_type='artist'` (and vice versa)
inside their own inquiry: message forgery.

**Decision:** drop the legacy policy; the two strict policies remain and now
actually bind.

### 6. Identity spoofing via `user_metadata` — CONFIRMED (worse than reported), fixed

Three spoofable layers, all rooted in `user_metadata` being **client-editable**
(any logged-in user can call `supabase.auth.updateUser({ data: {...} })`):

- RLS: `current_line_user_id()` read
  `auth.jwt()->'user_metadata'->>'line_user_id'` → set someone else's LINE ID
  in your own user_metadata and RLS treats you as them (chat reads, etc.).
- Server: `extractUserFromSession` read `user_metadata.sub` from
  `getSession()`, which only decodes the cookie without server-side JWT
  verification → the same spoof reached every `requireAuth()` route.
- Middleware: the `/admin` route gate read
  `user.user_metadata?.sub ?? user.user_metadata?.line_user_id` → forge an
  admin LINE ID in your own user_metadata and the admin UI shell loads
  (data routes were still blocked by `requireAdmin()`). Found by the
  security review of this PR; now reads `app_metadata.line_user_id`.

**Decision (three parts, one migration + code):**

1. Identity moves to `app_metadata` (writable only by the service role).
   LINE callback + dev-login now set `app_metadata.line_user_id` on
   createUser/updateUserById; migration backfills
   `auth.users.raw_app_meta_data` for existing users.
2. `current_line_user_id()` re-pointed at `'app_metadata'`.
3. Server auth switched to `supabase.auth.getUser()` (verifies the token with
   the Auth server) + `extractAuthUser()` which reads identity **only** from
   `app_metadata` — no user_metadata fallback, by design. Display name /
   avatar still come from user_metadata (cosmetic, not identity).

**Rollout note (deploy gate):** migration 018 MUST be applied (`supabase db
push`) before — or immediately with — the code deploy. The new code trusts
only `app_metadata.line_user_id`; until the backfill runs, every existing
user resolves to logged-out. JWT claims (`auth.jwt()`) refresh on token
renewal, so for existing sessions the RLS-side claim can be stale up to ~1h
after deploy (affects realtime chat reads only). `getUser()` returns fresh
app_metadata immediately, so server-side auth is correct from the first
request once the backfill has run. The backfill runs in the same migration,
before the function swap.

**Backfill scope decision:** the backfill keys on
`raw_user_meta_data ? 'line_user_id'` and deliberately does NOT coalesce from
`sub`. Both write paths (LINE callback, dev-login) always populate
`line_user_id`, so coverage is effectively complete; any straggler is treated
as logged out and self-heals on next LINE login (which sets `app_metadata`
from the verified LINE profile). Broadening the one-time trust of
client-editable `user_metadata` to a second key would only widen the window
for pre-planted spoofed values.

## Advisor findings fixed in the same migration

- **ERROR — SECURITY DEFINER views** `artist_rating_summary`,
  `artist_saved_count`: bypassed RLS on underlying tables and carried full
  write grants to anon/authenticated. → `security_invoker = true` + REVOKE
  all write privileges.
- **WARN — function_search_path_mutable** on `current_line_user_id`,
  `current_artist_id`, `update_updated_at`. → `SET search_path = ''` with
  schema-qualified references.

## Out of scope / follow-ups

- `getUser()` adds one Auth-server round-trip per `getCurrentUser()` call
  (vs. cookie-only `getSession()`). Accepted: correctness over latency on
  auth; revisit with request-level memoization if profiling shows it matters.
- OIDC `signInWithIdToken({ provider: 'kakao' })` path in the LINE callback:
  if it ever succeeded, that user would lack `app_metadata.line_user_id` and
  be treated as logged out. In practice this path always fails (LINE token to
  kakao provider) and falls back to the admin flow. Tracked as dead code to
  remove separately.
- Open-redirect check on `line_auth_redirect` (noted in PR #177) — separate
  ticket.
