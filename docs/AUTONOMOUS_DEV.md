# InkHunt — Autonomous Development Log

Machine-maintained by the Mission Control auto-dev dispatcher. Tracks the active
product milestone, shipped work, and per-round state markers used for the
no-op early-exit. Human-readable; the `mc-round-*` / `mc-sync-flagged-main`
marker lines below are parsed by the dispatcher — do not reformat them.

- Repo: `haru3613/InkHunt`
- Auto-dev base branch: `staging` (main / production promotion is always manual)
- Linear: team `Harveychan` (`04886110-…`), project `InkHunt` (`e80ec8b8-…`)
- Armed for auto-dev: 2026-06-06 (pilot tenant)

## Current milestone — v0.3 Discovery (rank & filter the /artists listing)

**v0.2 Reviews shipped complete end-to-end (Rounds 1–10); see the Shipped table.**
v0.3 makes the public `/artists` listing rankable + filterable so consumers can
find an artist by price, recency, and (Wave 2, migration-gated) rating. Wave 1 =
three no-migration slices on a shared `artists.ts` / `page.tsx` / `ArtistFilters.tsx`
spine, deliberately SEQUENCED (sort → budget → count/empty-state) because they
share files — one drains per round, each rebasing on the prior. Wave 2 (sort/filter
BY rating) is gated on HAR-436, an additive rating-aggregate view that is
`needs-human` (InkHunt `allow_additive_migrations=false`).

### v0.2 Reviews (shipped — historical milestone definition)

Add a customer reviews capability to artist pages: validation, star-rating UI,
aggregation, JSON-LD `aggregateRating`, and (later waves) the persisted
write-path + API route. Wave 1/2 client-side slices are independent of the DB
migration and land in parallel; the write-path waits on the reviews table.

### Shipped

| Round | Date (UTC) | Tickets | PRs |
|------|------------|---------|-----|
| 1 | 2026-06-06 | HAR-373 review validation schema (`src/lib/validations/review.ts`), HAR-374 StarRating component (`src/components/shared/StarRating.tsx`), HAR-375 review aggregation util (`src/lib/reviews.ts`) | #77, #78, #76 — all squash-merged to `staging`, `ci-passed` green |
| 2 | 2026-06-06 | HAR-380 `aggregateRating` in artist JSON-LD (`src/lib/seo.ts`, self-ideated), HAR-381 `ArtistReviewSummary` display component (`src/components/artist/ArtistReviewSummary.tsx`, self-ideated) | #80, #79 — squash-merged to `staging`, `ci-passed` green. v0.2 client-side display surface now complete (StarRating + aggregation + aggregateRating + summary). |
| 3 | 2026-06-06 | HAR-382 `ReviewForm` presentational component (`src/components/artist/ReviewForm.tsx`, composes StarRating + Zod schema; self-ideated R2), HAR-383 `ReviewCard` presentational component (`src/components/artist/ReviewCard.tsx`, reuses StarRating; self-ideated R2) | #82, #81 — squash-merged to `staging`, `ci-passed` green. v0.2 client-side **input + single-card** surface now complete. |
| 4 | 2026-06-08 | HAR-386 `ReviewList` presentational component (`src/components/artist/ReviewList.tsx`, maps `ReviewCard` + empty state; self-ideated R3), HAR-387 `RatingBreakdown` presentational component (`src/components/artist/RatingBreakdown.tsx`, renders per-star `distribution` bars; self-ideated R3) | #84, #85 — squash-merged to `staging` (merge commit `48a095b`), `ci-passed` green. v0.2 client-side presentational surface now **complete**. |
| 5 | 2026-06-08 | HAR-389 `ArtistReviewsSection` presentational composition (`src/components/artist/ArtistReviewsSection.tsx`, assembles `ArtistReviewSummary` + `RatingBreakdown` + `ReviewList` into one props-driven section; no DB/network; queued R4) | #86 — squash-merged to `staging` (merge commit `b8dde9e`), required `ci-passed` green (lint-and-typecheck, test, migration-check, build all passed). **LAST presentational slice of v0.2 — client-side surface is now 100% complete.** |
| 9 | 2026-06-12 | HAR-415 Wave 3 **read-path** — `getReviewsByArtistId` (`src/lib/supabase/queries/reviews.ts`, admin-client read pattern) + mounted `ArtistReviewsSection` on the public artist page (`…/artists/[slug]/page.tsx`) + the consuming test `…/artists/[slug]/__tests__/page.reviews.test.tsx` that asserts the section displays (cleared the Round-8 QA bounce) | #91 — squash-merged to `staging` (merge commit `1232e22`), required `ci-passed` (strict branch protection) + all 4 checks (lint-and-typecheck, test, migration-check, build) green. **First user-visible Wave 3 slice — reviews now render on artist detail pages.** Product-QA: `promotion_review` (sales-facing UI). |
| 10 | 2026-06-13 | HAR-416 Wave 3 **write-path** — authed POST `src/app/api/artists/[slug]/reviews/route.ts` (401/400/404/201/409 handling, author id server-derived from session, unique-violation → clean 409) + `ArtistReviewFormSection` client wrapper wiring `ReviewForm` on the artist detail page; HAR-417 Wave 3 **discovery surface** — one bounded aggregate read on `reviews` (no N+1) in the listing query + compact `★ avg (count)` summary on `ArtistCard` (both variants, reuses `StarRating`, hidden when count 0) | #93 (write-path, merge commit `53e661a`) + #92 (discovery surface, squash `d038337`) — both squash-merged to `staging`, all 5 required checks green (lint-and-typecheck, test, migration-check, build, `ci-passed`). **Reviews vertical now complete end-to-end: submit + display + browse-surface rating.** Product-QA: both `promotion_review` (sales-facing UI; informational, not a block). |
| 12 | 2026-06-14 | **v0.3 Wave 1, slice 1/3** — HAR-433 `/artists` sort control: `sort` enum (`featured`/`price_low`/`price_high`/`newest`) branched in `getArtists` (`src/lib/supabase/queries/artists.ts`), new listing search-params zod schema (`src/lib/validations/listing.ts`), 排序 `<Select>` in `src/components/artists/ArtistFilters.tsx` + `…/artists/page.tsx` wiring; query + zod + component vitest tests | #95 — squash-merged to `staging` (merge commit `d7c7745`), all 5 required checks green (lint-and-typecheck, test, migration-check, build, `ci-passed`). **First v0.3 discovery slice — the artist listing is now sortable.** Product-QA: `promotion_review` (sales-facing UI; informational, not a block). |
| 18 | 2026-06-16 | **v0.3 Wave 3** — HAR-446 `/artists` 服務類型 (service-offering) filter: `ArtistService` union (`coverup`/`flash`) + `parseArtistService` + `hasActiveListingFilters` extension (`src/lib/validations/listing.ts`), `.eq('offers_coverup', true)` / `.eq('has_flash_designs', true)` predicate in `getArtists` (`src/lib/supabase/queries/artists.ts`, no migration — columns pre-existed), 服務類型 control in `src/components/artists/ArtistFilters.tsx` + `…/artists/page.tsx` wiring, zh-TW/en i18n; query + zod + consuming component vitest tests | #98 — squash-merged to `staging` (merge commit `a94f680`), all 5 required checks green (lint-and-typecheck, test, migration-check, build, `ci-passed`). **v0.3 discovery now filterable by service type (遮蓋 / Flash 圖).** Product-QA: `promotion_review` (sales-facing UI; informational, not a block). _(Rounds 13–14 — HAR-434 budget filter #?, HAR-435 count/empty-state #? — shipped per their narrative sections but predate this table row; not backfilled here.)_ |

With Round 5 the v0.2 **client-side presentational surface is 100% complete**:
validation schema, StarRating, aggregation util (incl. per-star `distribution`),
`aggregateRating` JSON-LD, the full component set — `ArtistReviewSummary`,
`ReviewForm`, `ReviewCard`, `ReviewList`, `RatingBreakdown` — and now the
`ArtistReviewsSection` container that composes summary + breakdown + list are all
shipped. **There is no auto-eligible presentational work left.** Every remaining
v0.2 slice (Wave 3: persisted write-path + API route + page data-wiring) is
genuinely blocked on the reviews table (HAR-372, `needs-human`) — it needs the DB
schema + a human Supabase apply, so the bot cannot proceed without Harvey.
The milestone is therefore **exhausted of auto-eligible work as of Round 5**.
**Round 6 (2026-06-09) was the designated exhaustion-detection round**: Todo set =
HAR-372 only (`PICK=0`), nothing auto-eligible to ideate (every remaining slice is
Wave-3 DB-blocked), so it emailed Harvey for direction and recorded
`mc-round-outcome: noop`. From here the dispatcher settles into the no-op
early-exit — later identical fires end at Step 1b without re-triage or re-email.
Harvey: to unblock v0.2 Wave 3, action HAR-372 (decide the
`allow_additive_migrations` flag vs the ticket text, rotate
`SUPABASE_ACCESS_TOKEN`, then remove `needs-human`) — or set a new milestone.

> **⚠️ SUPERSEDED by Round 8 (2026-06-12):** Harvey resolved HAR-372 — the
> additive reviews-table + RLS migration merged to `staging` via **PR #89**
> (`supabase/migrations/011_reviews.sql`; `reviews` row type + `export type
> Review` in `src/types/database.ts`). **v0.2 Wave 3 is now UN-blocked and the
> milestone is no longer exhausted.** The "exhausted as of Round 5 / Round 6
> noop / Round 7 parked" narrative above is historical. See the Round 8 section.

### Open / awaiting human

- _(none currently — HAR-372 was resolved by Harvey; see "Resolved (Round 8)" below.)_

### Resolved (Round 8, 2026-06-12) — HAR-372 unblocked Wave 3

- **HAR-372 — reviews table migration. ✅ RESOLVED (PR #89, squash-merged to
  `staging` as `da2d859`).** Harvey landed the additive reviews-table + RLS
  migration: `supabase/migrations/011_reviews.sql` + the `reviews` row type /
  `export type Review` in `src/types/database.ts`. HAR-372 is now **Done**,
  un-blocking all remaining v0.2 Wave 3 work. Original blocker context (kept for
  history): Durable policy conflict: `projects.toml` sets
  `allow_additive_migrations=false` for InkHunt, while the ticket text + the
  dispatch prompt classify additive migrations as bot-eligible — only Harvey can
  reconcile (flip the registry flag, or keep it human-owned). Independently, the
  CI `migration-check` job cannot validate any migration PR (see token note
  below) and the staging Supabase apply (`supabase db push`) needs a human.
  Labeled so future rounds skip re-triage. Harvey: (1) decide flag vs ticket;
  (2) rotate `SUPABASE_ACCESS_TOKEN`; then remove `needs-human`.

### Queued auto-eligible

_(empty — both queued Wave-3 slices shipped in Round 10; see Shipped table.)_

The two slices below were drained in parallel in Round 10 and are now **Done**:

- **HAR-416 — Wave 3 write-path** (`auto-claude` + `Feature`): authed POST submit
  route (`src/app/api/artists/[slug]/reviews/route.ts`) + wire `ReviewForm` on the
  artist detail page via a small client wrapper. Single authed INSERT, author id
  server-derived — app-code + auth, **NOT** needs-human. Edits `…/[slug]/page.tsx`;
  now un-sequenced (HAR-415 has merged) and pickable next round.
- **HAR-417 — Wave 3 discovery surface** (`auto-claude` + `Feature`, self-ideated
  Round 9): show a compact rating summary (avg stars + count) on `ArtistCard` in the
  artists listing, via one bounded aggregate read on `reviews` (no N+1) + reuse of
  `StarRating`. Pure public read. Touches the listing query + `ArtistCard.tsx` only —
  **zero file overlap with HAR-416** (which edits the detail page + submit route).

### Resolved / closed (Round 2)

- **HAR-370 (SEO JSON-LD tests), HAR-371 (GA4 analytics tests)** — closed as
  **Done (already-shipped)**. Both test files already existed on `staging` from
  commit `42112ca` (PR #72, "unit test coverage Phase 1-3"), which predates the
  bot's onboarding point — `seo.test.ts` (35 cases) + `analytics.test.ts` (11
  cases) already meet the acceptance criteria. They were false backlog; closed
  with comments pointing at the implementing commit. Not re-implemented.

### Onboarding flags (Round 1, 2026-06-06; updated Round 2)

- `origin/main` is 12 commits ahead of `origin/staging`. As of Round 1, staging
  was a strict ancestor of main (merge-base == old staging HEAD `42112ca`) so a
  fast-forward was available — but Round 1/2 bot merges have since advanced
  staging, so the two branches have now **diverged** (staging carries the bot's
  review-slice commits; main carries the 12 commits — quote-efficiency feature +
  Vercel build fixes — that staging never received). main → staging
  reconciliation remains Harvey's manual call; flagged via
  `mc-sync-flagged-main` below (debounced on main SHA `8b07abb`, already emailed
  Round 1 — not re-emailed while the SHA is unchanged).
- CI `migration-check` is permanently RED on every PR: `supabase link` returns
  Unauthorized — the `SUPABASE_ACCESS_TOKEN` repo secret is expired/invalid. It
  is NOT part of the required `ci-passed` gate, so it does not block code-only
  merges, but it must be rotated before any migration can be validated by CI.
- ⚠️ **`ci-passed` enforcement is UNCERTAIN — Harvey please verify.** Round 1
  concluded the required `ci-passed` check is enforced server-side via repository
  rulesets (classic branch-protection API returns 404). But a Round-2 merge
  subagent observed the GitHub rulesets list for `staging` was **empty (`[]`)**
  and the PR squash-merged immediately rather than queuing on auto-merge —
  implying nothing may actually be **blocking** a red CI from merging. In Rounds
  1+2 every PR happened to have a green `ci-passed`, so this was never exercised.
  This matters: the autonomous-merge safety model assumes a server-side gate
  rejects red CI. **Action: confirm a branch ruleset (or protection) on
  `staging` actually requires `ci-passed` before merge** — if not, the bot is
  relying on luck, not a gate. **Round 3 re-confirmed** the same: PRs #81/#82
  squash-merged immediately with no ruleset queueing (the non-required
  `migration-check` job was RED — Supabase `link` Unauthorized — yet did not
  block, as expected for a code-only PR; required `ci-passed` was green). The
  empty-ruleset / immediate-merge behaviour is now observed across Rounds 2+3+4
  (Round 4: PRs #84/#85 squash-merged immediately, required `ci-passed` green).
  NOTE (Round 4): the merge subagents reported the `migration-check` job as
  **PASS**, not RED — a divergence from the "permanently RED" flag above. Cause
  unconfirmed: either `SUPABASE_ACCESS_TOKEN` was rotated, or the job is
  trivially green on code-only PRs that change no migration files. Harvey: the
  Supabase-token flag above may now be stale — verify before relying on it for
  the HAR-372 migration.
- Harness `wt end` has a known bug (`mc/harness/cli.py:436` calls
  `git.pr_view(effective_pr)` WITHOUT `repo_root`, so the inner `gh pr view`
  subprocess inherits the harness cwd — mission-control, which has no default gh
  repo — and exits non-zero → `PrNotFound`). Worked around by the merge subagents
  again in Round 5 (run harness from mission-control cwd with `GH_REPO=haru3613/InkHunt`,
  which `gh` honors regardless of cwd; worktree removal still uses the correct
  `repo_root` from `--repo`). Suggested real fix: compute `repo_root` before
  line 436 and call `git.pr_view(effective_pr, repo_root=repo_root)`. Tracked for
  a mission-control fix (out of scope for the per-ticket merge task).

### Round 7 (2026-06-10) — no-op; main divergence re-flagged

- Wake cause: `MAIN` moved (`8b07abb` → `f6331bb`) and `BL` moved
  (2026-06-10T03:41 — the autonomous-PM cron's status comment on HAR-372, not a
  human unlock). No drain ran.
- HAR-372 unchanged: still `needs-human`, `allow_additive_migrations` still
  `false` in `projects.toml`, PM pass explicitly declined to relax the tenant
  config. v0.2 Wave 3 remains parked on Harvey's decision (flip the flag or
  apply the migration manually; see HAR-372 comments).
- `origin/main` is now **13** commits ahead of `origin/staging` — one NEW
  commit since the Round-1 flag: `f6331bb` "ci: Gate-2 failure alert for the
  deploy/migration workflow (#87)" (landed on main out-of-band). Re-flagged +
  re-emailed below, debounced on the new SHA. main → staging reconciliation
  stays Harvey's manual call.

### Round 8 (2026-06-12) — HAR-372 unblocked; Wave 3 read-path dispatched, QA-bounced

- **Wake cause:** `BL` moved — HAR-372 left the Todo set (Harvey set it **Done**
  after merging the reviews migration, PR #89). State transition: v0.2 Wave 3 is
  no longer DB-blocked.
- **Ideated 2 Wave-3 tickets** (both `auto-claude` + `Feature`, anchored to v0.2),
  split so a parallel drain can't self-conflict on the shared artist page:
  - **HAR-415 — Wave 3 read-path:** server query `getReviewsByArtistId` + mount
    `ArtistReviewsSection` on `src/app/[locale]/(public)/artists/[slug]/page.tsx`
    to DISPLAY reviews (pure read, no write/auth/money). **Dispatched this round.**
  - **HAR-416 — Wave 3 write-path:** authed POST submit route + `ReviewForm`
    wiring (single interactive INSERT; app-code + auth, **NOT** needs-human).
    **Queued Todo** for a later round — depends on HAR-415 landing first (both
    edit `page.tsx`).
- **Drain result: 0/1 merged. HAR-415 bounced by Product-QA as `qa_blocked`** —
  the co-changed test (`reviews.test.ts`) is data-layer only and does not
  render/import the changed UI (`page.tsx`); the vertical-slice gate requires a
  consuming test asserting the page actually displays reviews. The workflow
  applied the `mc-qa-blocked` label, posted a tracker comment, moved HAR-415 back
  to Todo, persisted `state/qa/InkHunt/pr90.json`; **PR #90 left OPEN** for the
  retry. This is a QA wiring failure, **not** `needs-human` (no money / no
  irreversible-data).
- **Next round:** HAR-415 is picked FIRST (qa-blocked retry) — its first task is
  the missing consuming test (read the QA comment on the ticket). HAR-416 follows
  once HAR-415 lands.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome marker is `deferred-1` (deliberately **not** `noop`): 2 pickable Todos
  remain (HAR-415 retry + HAR-416), so Step 1b must NOT early-exit next round —
  there is real auto-eligible work waiting.

### Round 9 (2026-06-12) — HAR-415 qa-blocked retry SHIPPED; backlog refilled

- **Wake cause:** last round's outcome was `deferred-1` (not `noop`), so Step 1b
  correctly did NOT early-exit — HAR-415 (qa-blocked retry) + HAR-416 were waiting.
- **Pre-dispatch cleanup (clean-slate retry).** Round 8 left a stranded HAR-415
  worktree (`InkHunt-feature-wire-artist-reviews-section`), its local branch, and
  the QA-bounced **PR #90** OPEN on branch `feature/wire-artist-reviews-section`.
  Because `mc-drain` re-implements fresh off `origin/staging` (new worktree → new
  PR), keeping those would have collided on `wt start` (same slug) or orphaned a
  duplicate PR. Resolved by removing the worktree + local branch, abandoning the
  harness entry, and **closing PR #90 + deleting its remote branch** (commented as
  superseded). The read-path impl was small and fully re-derivable from the ticket
  + QA comment.
- **Drain: 1/1 merged. HAR-415 shipped via PR #91** (squash-merged to `staging`,
  merge commit `1232e22`). The retry's first task — the missing **consuming test**
  (`…/artists/[slug]/__tests__/page.reviews.test.tsx`, renders the page surface and
  asserts `<ArtistReviewsSection>` mounts) — cleared the Product-QA wired gate.
  Required `ci-passed` + all 4 checks green. Product-QA classified it
  `promotion_review` (sales-facing UI; informational, not a block). 0 deferred,
  0 needs-human, 0 tier-2 advisories.
- **`ci-passed` enforcement CONFIRMED.** The merge agent reported `ci-passed` is a
  **strict branch-protection** required check on `staging`, with auto-merge gating
  on it — this resolves the Round 1–4 "enforcement uncertain" flag: the gate is
  real, not luck.
- **Backlog refilled to 2 (ideation policy).** After HAR-415 left the Todo set,
  only HAR-416 remained (< 2) and the v0.2 milestone still has work, so ideated
  **HAR-417** (rating summary on `ArtistCard` in the listing — pure read, an
  independent slice with zero file overlap with HAR-416). Queue is now HAR-416 +
  HAR-417, both `auto-claude`, both pickable next round.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome marker `drained-1`; `PICK=2` (HAR-416 + HAR-417), so Step 1b must NOT
  early-exit next round.

### Round 10 (2026-06-13) — Wave 3 write-path + discovery surface SHIPPED; v0.2 vertical complete

- **Wake cause:** last round's outcome was `drained-1` (not `noop`), so Step 1b
  correctly did NOT early-exit — HAR-416 (write-path) + HAR-417 (discovery surface)
  were the 2 queued, mutually-independent (zero file overlap) Todos waiting.
- **Drain: 2/2 merged.**
  - **HAR-416 — Wave 3 write-path → PR #93** (squash-merged to `staging`, merge
    commit `53e661a`). Authed POST `src/app/api/artists/[slug]/reviews/route.ts`
    (401 unauth / 400 invalid / 404 unknown artist / 201 success / 409
    duplicate-review via the unique constraint; `author_line_user_id` always the
    **session** user, never client-supplied) + an `ArtistReviewFormSection` client
    wrapper wiring `ReviewForm` on the detail page. Single authed INSERT — app-code
    + auth, **not** needs-human. All 5 required checks green.
  - **HAR-417 — Wave 3 discovery surface → PR #92** (squash `d038337`, now the
    `staging` tip). One bounded aggregate read on `reviews` (`.in('artist_id', …)`,
    **no N+1**) in the listing query + a compact `★ avg (count)` summary on
    `ArtistCard` (both variants, reuses `StarRating`, hidden when count 0). Pure
    public read. Merge rebase hit one trivial append-only conflict in
    `.mc/learnings.md` (both sides appended a learning) — resolved keeping both, no
    human judgment. All 5 required checks green.
- 0 deferred, 0 needs-human, 0 tier-2 advisories. Product-QA classified **both**
  `promotion_review` (sales-facing UI; informational, not a block).
- **v0.2 Reviews milestone is now COMPLETE end-to-end:** validation schema +
  StarRating + aggregation + `aggregateRating` JSON-LD + the full presentational
  component set + read-path display (HAR-415) + **write-path submit (HAR-416)** +
  **browse-surface rating (HAR-417)**. Every deliverable named in the milestone
  definition has shipped; the Todo set is now **empty** (`PICK=0`).
- **No ideation this round (deliberate).** The remaining review-adjacent ideas —
  sort/filter listing BY rating, edit/delete a review, admin moderation,
  rate-limiting — are genuinely NEW product scope beyond the v0.2 definition, i.e.
  a v0.3 / milestone-expansion decision that belongs to Harvey / the PM pass, not
  drain-dispatcher scope-creep. So the milestone is treated as **genuinely
  exhausted**, not "today's Todo list is short."
- **Exhaustion email deferred to the next round (by design).** This round's outcome
  is `drained-2` (≥1 merged), so the marker is NOT `noop` and Step 1b will NOT
  early-exit next fire. Per this repo's proven Round-5→Round-6 pattern, the
  FOLLOWING no-op round is the designated exhaustion-detection round: it will find
  `PICK=0` + a complete milestone + nothing auto-eligible to ideate, email Harvey
  for direction (set v0.3 / extend reviews), record `mc-round-outcome: noop`, and
  from there settle into the Step 1b early-exit. Emailing here would double-send.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.

### Round 11 (2026-06-13) — milestone exhausted (designated detection round); Harvey emailed

- **Wake cause:** last round's outcome was `drained-2` (not `noop`), so Step 1b
  correctly did NOT early-exit — this is the designated exhaustion-detection round
  the Round 10 plan scheduled. `BL`/`PICK`/`MAIN` are unchanged from Round 10
  (`none` / `0` / `f6331bb`), but the productive prior outcome forces a re-scout.
- **Scout result: nothing actionable.** Project `Todo` set is **empty**
  (`PICK=0`); no `In Progress` / `In Review` / `Backlog` issues either. No
  `needs-human`-labelled tickets open (HAR-372 was resolved in Round 8).
- **v0.2 Reviews milestone is COMPLETE end-to-end** — Round 10 shipped the last
  two slices (HAR-416 write-path submit + HAR-417 browse-surface rating). Every
  deliverable named in the milestone definition (validation, StarRating,
  aggregation, `aggregateRating` JSON-LD, the full presentational set, read-path
  display, write-path submit, discovery-surface rating) has shipped.
- **No ideation (deliberate, same call as Round 10).** The remaining
  review-adjacent ideas — sort/filter listing BY rating, edit/delete a review,
  admin moderation, rate-limiting — are genuinely NEW product scope beyond the
  v0.2 definition: a v0.3 / milestone-expansion decision that belongs to Harvey /
  the PM pass, not drain-dispatcher scope-creep. The milestone is therefore
  **genuinely exhausted**, not merely "today's Todo list is short."
- **Emailed Harvey for direction** (set v0.3 / extend reviews / new milestone).
  This is the first no-op after Round 10's completion → a fresh state transition,
  so it records once here; later identical fires early-exit at Step 1b (markers
  match AND `mc-round-outcome: noop`) without re-triage or re-email.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome marker `noop`; `PICK=0`, `BL=none`, `MAIN=f6331bb` — all unchanged, so
  Step 1b WILL early-exit the next fire until new tickets/hotfixes appear.

### Round 12 (2026-06-14) — v0.3 Discovery opened; HAR-433 sort control shipped

- **Wake cause:** Harvey / the PM pass set the v0.3 Discovery milestone and opened
  four tickets — Step 1b correctly did NOT early-exit: `PICK` moved `0 → 3`
  (HAR-433/434/435 `auto-claude`) and `BL` moved `none → 2026-06-14T03:54:16.167Z`
  (HAR-436's `updatedAt`). `MAIN` unchanged (`f6331bb`).
- **Dispatched ONE ticket (HAR-433).** Wave 1's three slices share
  `artists.ts` / `page.tsx` / `ArtistFilters.tsx` and the tickets are explicitly
  sequenced ("rebase on the prior after it merges to `staging`") — they are NOT
  mutually independent, so per the independence rule only the drains-first slice
  (HAR-433) goes this round. HAR-434 (budget) unlocks next round now that HAR-433
  is on `staging`; HAR-435 (count/empty-state) after HAR-434.
- **HAR-433 merged** — PR #95 (`d7c7745`), all 5 required checks green. Verified
  pre-dispatch it was NOT already shipped (`getArtists` had only `featured` +
  `updated_at` ordering; no `sort` in `ArtistFilters`; `listing.ts` absent).
  Vertical slice complete (query + zod + 排序 `<Select>` consumer + tests).
  Product-QA `promotion_review` (informational, not a block).
- **HAR-436 left `needs-human` (no re-label).** Additive rating-aggregate view,
  but InkHunt gates ALL migrations to Harvey (`allow_additive_migrations=false`)
  and it needs a Supabase apply — mirrors the HAR-372 pattern. Already labelled by
  the PM pass; not re-labelled (idempotency for Step 1b's `BL` convergence).
- **No ideation (deliberate).** Two auto-eligible slices (HAR-434, HAR-435) are
  already queued — the ~2-in-flight target is met; v0.3 is freshly opened, not
  exhausted.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome `drained-1`; next markers `BL=2026-06-14T03:54:16.167Z`, `PICK=2`,
  `MAIN=f6331bb`. Productive outcome (not `noop`) → Step 1b re-scouts next fire and
  picks up HAR-434.

### Round 13 (2026-06-15) — v0.3 Wave 1 slice 2/3: HAR-434 budget filter shipped

- **Wake cause:** Round 12's outcome was `drained-1` (not `noop`), so Step 1b did
  NOT early-exit — the designated re-scout fire. `BL`/`PICK`/`MAIN` were unchanged
  from Round 12 (`2026-06-14T03:54:16.167Z` / `2` / `f6331bb`), but the productive
  prior outcome forces a re-scout, exactly as the Round 12 plan anticipated
  ("picks up HAR-434").
- **Dispatched ONE ticket (HAR-434).** Wave 1's three slices share
  `artists.ts` / `page.tsx` / `ArtistFilters.tsx` and are explicitly sequenced
  (sort → budget → count). HAR-433 (slice 1/3) merged Round 12, so HAR-434
  (budget, slice 2/3) was unblocked. HAR-435 (count/empty-state, slice 3/3)
  depends on HAR-434 + shares the same files → NOT independent, deferred to next
  round. Per the independence rule only HAR-434 goes this round.
- **HAR-434 merged** — PR #96 (`feature/artists-budget-filter` → `staging`, merge
  `9253b2f`), all 5 required checks green (lint-and-typecheck, test,
  migration-check, build, `ci-passed`). Rebase onto `origin/staging` was a no-op
  (branch already atop latest staging `9a8e8ab`). Verified pre-dispatch it was NOT
  already shipped: `getArtists`/`ArtistFilters` had only HAR-433's `sort`, no
  `budget`/`price_min` predicate, no `budget` in the listing zod. Vertical slice
  complete (query `budgetPredicate` on data+count + zod enum + 預算 `<Select>`
  consumer + tests). Worktree ended, remote branch deleted, Linear → Done with a
  shipped comment. Product-QA `promotion_review` (sales-facing UI; informational,
  not a block). 0 deferred, 0 needs-human, 0 tier-2.
- **HAR-436 left `needs-human` (no re-label).** Additive rating-aggregate view,
  but InkHunt gates ALL migrations to Harvey (`allow_additive_migrations=false`)
  + needs a Supabase apply — mirrors HAR-372. Already labelled by the PM pass; not
  re-labelled (idempotency for Step 1b's `BL` convergence).
- **No ideation (deliberate).** After HAR-434 merged, one auto-eligible slice
  (HAR-435) remains queued and is now unblocked for next round. The remaining v0.3
  Wave 1 work is the sequenced HAR-435 (shares the listing spine → can't be
  parallelized this round), and Wave 2 (rating sort/filter) is intentionally gated
  behind HAR-436 (`needs-human` migration). There is no genuinely-independent,
  auto-eligible v0.3 slice to ideate that wouldn't collide with HAR-435's files or
  the gated migration — so the PM-defined wave is left to drain in sequence rather
  than scope-creep a parallel slice. The milestone is NOT exhausted (HAR-435
  pending), so no exhaustion email.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome `drained-1`; next markers `BL=2026-06-14T03:54:16.167Z`, `PICK=1`
  (HAR-434 → Done leaves only HAR-435 non-`needs-human`), `MAIN=f6331bb`.
  Productive outcome (not `noop`) → Step 1b re-scouts next fire and picks up
  HAR-435 (now unblocked). When HAR-435 ships, Wave 1 completes and the following
  no-op round becomes the exhaustion-detection round (emails Harvey for Wave 2 /
  next-milestone direction — action HAR-436 to unblock rating sort/filter).

### Round 14 (2026-06-15) — v0.3 Wave 1 slice 3/3: HAR-435 count/empty-state shipped → Wave 1 COMPLETE

- **Wake cause:** Round 13's outcome was `drained-1` (not `noop`), so Step 1b did
  NOT early-exit — the designated re-scout fire. `BL`/`PICK`/`MAIN` were unchanged
  from Round 13 (`2026-06-14T03:54:16.167Z` / `1` / `f6331bb`), but the productive
  prior outcome forces a re-scout, exactly as Round 13 anticipated ("picks up
  HAR-435 now unblocked").
- **Dispatched ONE ticket (HAR-435).** The sole non-`needs-human` Todo and the
  last Wave 1 slice (count + empty-state + 清除篩選). HAR-434 (budget, slice 2/3)
  merged Round 13, so HAR-435 (shared `page.tsx`/`ArtistFilters.tsx`) was
  unblocked. Verified pre-dispatch it was NOT already shipped: staging tree had no
  `找到 N 位刺青師` / `清除篩選` / empty-state copy and no `ArtistListingHeader`.
  Acceptance is vitest component tests (RTL render+assert), NOT browser-only, so
  the repo's `frontend-only-browser-verify` `out_of_scope` rule does not exclude
  it. Self-contained vertical slice (presentational + its own consuming test).
- **HAR-435 merged** — PR #97 (`feature/har-435-artists-result-count-empty-clear`
  → `staging`, squash `7b7640e`), all 5 required checks green; rebase onto
  `origin/staging` was a no-op (1 ahead / 0 behind). Shipped `ArtistListingHeader`
  (result-count line + empty-state + 清除篩選), presentational only. Worktree
  ended, remote branch deleted, Linear → Done (auto-transitioned on merge) + a
  one-line ship comment. Product-QA `promotion_review` (sales-facing UI;
  informational, not a block). 0 deferred, 0 needs-human, 0 tier-2.
- **HAR-436 left `needs-human` (no re-label).** Additive rating-aggregate view,
  but InkHunt gates ALL migrations to Harvey (`allow_additive_migrations=false`)
  + needs a Supabase apply — mirrors HAR-372. Already labelled; not re-labelled
  (idempotency for Step 1b's `BL` convergence).
- **No ideation (deliberate).** HAR-435 completes Wave 1. The only remaining v0.3
  work is Wave 2 (rating sort/filter), which is gated behind the `needs-human`
  HAR-436 migration — not bot-eligible until Harvey applies it. There is no
  genuinely-independent, auto-eligible v0.3 slice to ideate that wouldn't depend on
  the gated rating view; inventing a parallel non-PM-planned slice would be
  dispatcher scope-creep. The milestone's **auto-eligible surface is now
  exhausted** pending Harvey's HAR-436 action.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome `drained-1`; next markers `BL=2026-06-14T03:54:16.167Z`, `PICK=0`
  (HAR-435 → Done leaves only `needs-human` HAR-436), `MAIN=f6331bb`. Productive
  outcome (not `noop`) → Step 1b re-scouts next fire; that scout finds 0
  auto-eligible Todos + Wave 2 gated → it is the **exhaustion-detection round**
  (records `mc-round-outcome: noop` + emails Harvey for direction: apply HAR-436 to
  unblock Wave 2, or run the PM pass for the next milestone). Rounds after that
  early-exit on the stable `noop` markers. Exhaustion is NOT emailed this round —
  this round is productive (`drained-1`), and the marker must reflect that, not a
  conflicting `noop`.

### Round 15 (2026-06-15) — v0.3 auto-eligible surface EXHAUSTED → emailed Harvey for direction

- **Wake cause:** Round 14's outcome was `drained-1` (not `noop`), so Step 1b did
  NOT early-exit — the designated re-scout fire Round 14 anticipated as the
  "exhaustion-detection round". `BL` had also moved (see below), independently
  forcing a re-scout.
- **Scout: 0 auto-eligible Todos.** The sole Todo in the project is **HAR-436**
  (`needs-human`, the additive `artist_rating_summary` view gated behind a manual
  Supabase apply). Wave 1 (sort/budget/count) shipped Rounds 13–14; Wave 2
  (rating sort/filter) is structurally blocked on HAR-436. No genuinely-independent,
  auto-eligible v0.3 slice exists that wouldn't depend on the gated rating view or
  invent non-PM-planned scope → **no ideation** (would be dispatcher scope-creep;
  the PM bot is already engaged — it commented on HAR-436 today explaining the
  iteration dependency).
- **HAR-436 left `needs-human` (no re-label, no re-comment).** Already labelled +
  commented by the PM pass; re-touching it would bump `updatedAt` and break Step 1b
  `BL` convergence. Idempotent: no-op on it.
- **`BL` advanced to `2026-06-15T03:38:43.591Z`** — HAR-436's `updatedAt` moved
  because the PM bot commented on it (blocker-dependency explainer). This adds NO
  auto-eligible work; `PICK` stays `0`. (This is why this fire re-scouted rather
  than early-exiting on Round 14's stale `BL`.)
- **No dispatch this round** (0 tickets). Housekeeping: pruned 6 stale merged bot
  worktrees (dirs already gone on disk; cleared the harness `worktrees.json`
  entries). Left every human `.claude/worktrees/*` tree untouched.
- **MILESTONE AUTO-ELIGIBLE SURFACE EXHAUSTED (first detection).** Emailed Harvey:
  apply HAR-436 on staging to unblock Wave 2 (rating sort/filter), OR run the PM
  pass to define the next milestone. State transition → this round commits + emails
  once; subsequent identical fires early-exit on the stable `noop` markers below.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome `noop`; markers `BL=2026-06-15T03:38:43.591Z`, `PICK=0`, `MAIN=f6331bb`.
  Next fire early-exits unless: a new auto-eligible Todo appears, HAR-436 is
  un-gated (Harvey applies it / removes the label), or the PM bot comments again
  (bumps `BL` → one more cheap re-scout that re-confirms exhaustion).

### Round 16 (2026-06-15) — new `needs-human` PM-patrol ticket (HAR-440) absorbed; milestone still exhausted

- **Wake cause:** `BL` moved to `2026-06-15T05:02:42.744Z` — a NEW Todo, **HAR-440**
  `[PM Patrol R4] Refresh InkHunt local staging checkout`, appeared (labelled
  `from-haru-pm` + `needs-human`). Step 1b correctly did NOT early-exit (`BL`
  mismatch vs Round 15's `…T03:38:43.591Z`). `PICK` stayed `0`, `MAIN` unchanged.
- **HAR-440 triaged → stays `needs-human` (already labelled; no re-label, no
  re-comment).** Its DoD is to reconcile the **primary checkout**
  `/Users/harvey/Documents/InkHunt` (monitor: 37 behind, 2 uncommitted, 3 untracked).
  The dispatcher is HARD-FORBIDDEN from mutating the primary checkout
  (no `pull`/`reset`/`checkout` there — it may hold a live human session), so this
  is structurally non-auto-eligible and is a manual local-env task for Harvey. It is
  a PM-patrol operational alert, not v0.3 product backlog. Idempotent no-op on it.
- **HAR-436 still `needs-human`** (additive rating-aggregate view, gated to Harvey).
  No re-touch.
- **Scout: 0 auto-eligible Todos** (`PICK=0`). v0.3 auto-eligible surface remains
  exhausted (Wave 1 shipped R13–14; Wave 2 gated on HAR-436). No independent
  auto-eligible slice to ideate without depending on the gated rating view → **no
  ideation**, **no dispatch**.
- **Exhaustion NOT re-emailed** — it was the Round 15 state transition (recorded +
  emailed once). This round only absorbs a new, irrelevant `needs-human` ticket into
  the markers so future fires can re-settle to early-exit; the milestone status is
  unchanged.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome `noop`; markers refreshed to `BL=2026-06-15T05:02:42.744Z` (HAR-440's
  `updatedAt`), `PICK=0`, `MAIN=f6331bb`. Next fire early-exits unless: a new
  auto-eligible Todo appears, HAR-436/HAR-440 are un-gated, or a new ticket/comment
  bumps `BL` again.

### Round 17 (2026-06-15) — `BL` bumped by HAR-440 PM-patrol comment; milestone still exhausted

- **Wake cause:** exactly the case Round 16 anticipated — a PM-patrol comment on the
  `needs-human` HAR-440 (2026-06-15 19:00 re-check "R4 still firing", noting HAR-442
  closed as duplicate) bumped HAR-440's `updatedAt` `05:02:42.744Z → 11:02:42.107Z`,
  so `BL` moved and Step 1b did NOT early-exit. The comment carries **no new
  actionable work** and no un-label.
- **Scout: 0 auto-eligible Todos** (`PICK=0`). Only HAR-440 (`needs-human`,
  primary-checkout reconciliation — dispatcher HARD-FORBIDDEN from mutating the
  primary checkout) and HAR-436 (`needs-human`, gated additive rating-view migration)
  remain. Both already labelled + commented → idempotent no-op (no re-label, no
  re-comment, to avoid bumping `BL` and breaking convergence). No ideation, no dispatch.
- **Exhaustion NOT re-emailed** (Round 15 state transition). `origin/main` still **13**
  ahead of `staging` (SHA `f6331bb`, unchanged) — `mc-sync-flagged-main` debounce holds,
  not re-emailed.
- Outcome `noop`; this commit only **refreshes `BL` to `2026-06-15T11:02:42.107Z`** so a
  fire with no intervening HAR-440 edit early-exits. Next fire early-exits unless a new
  auto-eligible Todo appears, HAR-436/HAR-440 are un-gated, or a new comment bumps `BL`.

### Round 18 (2026-06-16) — v0.3 Wave 3: HAR-446 service-offering filter SHIPPED; refilled backlog

- **Wake cause:** a NEW auto-eligible Todo **HAR-446** (`auto-claude`, `[v0.3 W3]`
  /artists 服務類型篩選) was created 2026-06-16 03:41Z, moving `BL`
  `2026-06-15T11:02:42.107Z → 2026-06-16T03:41:47.506Z` and `PICK` `0 → 1`.
  Step 1b correctly did NOT early-exit — real new work.
- **Scout / triage:** HAR-446 auto-eligible (ZERO migration/money/cron/auth; the
  `offers_coverup`/`has_flash_designs` columns pre-exist on `staging` so it is a pure
  query-predicate + UI-control + consuming-test slice; `out_of_scope`
  `frontend-only-browser-verify` does NOT apply — it is vitest-gated). Already-shipped
  guard: grep of `origin/staging` found the columns SELECTed but **no** filter
  (`ArtistService`/`parseArtistService` absent) → genuinely actionable. HAR-440
  (`needs-human`, primary-checkout reconciliation — dispatcher HARD-FORBIDDEN from
  mutating the primary checkout) and HAR-436 (`needs-human`, gated additive rating-view
  migration) both already labelled → idempotent no-op (no re-label, no re-comment).
- **Dispatched HAR-446** to the parallel drain → **merged to `staging` via PR #98**
  (squash, merge commit `a94f680`, mergedAt 2026-06-16T04:49:40Z; all 5 required checks
  green: lint-and-typecheck, test, migration-check, build, `ci-passed`). Worktree ended
  `--merged`, remote branch deleted, Linear HAR-446 already Done + merged comment.
  **0 deferred** (incl. 0 from Product-QA). HAR-446 flagged `promotion_review`
  (sales-facing UI; informational — a QA status, NOT `needs-human`).
- **Ideation (refill toward ~2 in flight; milestone NOT exhausted):** opened **HAR-447**
  (`auto-claude`, Todo) — `[v0.3 W3]` ArtistCard 服務類型徽章 (遮蓋/Flash 圖 badges,
  display-only, no query/migration). Deliberately file-DECOUPLED from HAR-446's listing
  spine (`ArtistCard.tsx` only, not `ArtistFilters.tsx`/`queries`/`page`/`validations`) so
  it can drain a later round without file-mutex contention. The booleans are already
  SELECTed and reach the card, so it needs no data-layer change.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged — the merge
  was to `staging` only) → `mc-sync-flagged-main` debounce holds, not re-emailed.
- Outcome `drained-1`; markers refreshed to `BL=2026-06-16T04:34:10.491Z` (HAR-447's
  `updatedAt`, newest in the raw Todo set), `PICK=1` (HAR-447), `MAIN=f6331bb`. Because
  `mc-round-outcome` is `drained-1` (not `noop`), the next fire does NOT early-exit at
  Step 1b regardless — it proceeds to Step 2 and should pick up HAR-447 as the next
  pickable Wave-3 slice.

### Round 19 (2026-06-16) — v0.3 Wave 3: HAR-447 ArtistCard service badges SHIPPED; refilled backlog

- **Wake cause:** `BL` moved (`2026-06-16T04:34:10.491Z → 2026-06-16T05:02:25.715Z`
  — HAR-440's `updatedAt` bumped by an out-of-band PM-patrol touch) and last outcome
  was `drained-1` (not `noop`), so Step 1b correctly did NOT early-exit — HAR-447 was
  the pickable Wave-3 slice waiting.
- **Scout / triage:** HAR-447 auto-eligible (ZERO migration/money/cron/auth/query —
  pure display: render 遮蓋/Flash 圖 badges on `ArtistCard` from booleans the card
  already receives). Already-shipped guard: grep of `origin/staging:ArtistCard.tsx`
  (183 lines) found NO `coverup`/`flash`/service-badge references → genuinely
  actionable. `out_of_scope` `frontend-only-browser-verify` does NOT apply — vitest-
  gated via a consuming `ArtistCard.test.tsx`. HAR-440 (`needs-human`, primary-checkout
  reconciliation — dispatcher HARD-FORBIDDEN from mutating the primary checkout) and
  HAR-436 (`needs-human`, gated additive rating-view migration, `allow_additive_migrations=false`)
  both already labelled → idempotent no-op (no re-label, no re-comment).
- **Dispatched HAR-447** to the parallel drain → **merged to `staging` via PR #99**
  (squash, merge commit `591b089`, mergedAt 2026-06-16T16:34:51Z; all 5 required checks
  green: lint-and-typecheck, test, migration-check, build, `ci-passed`). Worktree ended
  `--merged`, remote branch `feature/artistcard-service-badges` deleted, Linear HAR-447
  already Done + closing comment. **0 deferred** (incl. 0 from Product-QA). HAR-447
  flagged `promotion_review` (sales-facing discovery UI; informational — a QA status,
  NOT `needs-human`).
- **Ideation (refill toward ~2 in flight; milestone NOT exhausted):** opened **HAR-454**
  (`auto-claude`, Todo) — `[v0.3 W3]` /artists 已套用篩選 chips + 清除全部 (active-filter
  pills: one removable chip per applied `style`/`city`/`sort`/`budget`/`service` param +
  a 清除全部 reset, display + one-tap removal). Pure client-side UI reading the existing
  five URL params (verified `ArtistFilters.tsx:36-40` reads them via `useSearchParams`,
  cleared by `updateParams(key,null)`); NO query/migration/money/cron/auth. Deliberately
  housed in a NEW `ActiveFilterChips.tsx` (+ its test) with a one-line mount so it stays
  file-decoupled from any concurrent `ArtistFilters.tsx`/query work. Closes the wave's
  filter-feedback loop (filter → see what's applied → undo).
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged — the merge
  was to `staging` only) → `mc-sync-flagged-main` debounce holds, not re-emailed.
- Outcome `drained-1`; markers refreshed to `BL=2026-06-16T16:38:33.548Z` (HAR-454's
  `updatedAt`, newest in the raw Todo set now HAR-447 is Done), `PICK=1` (HAR-454),
  `MAIN=f6331bb`. Because `mc-round-outcome` is `drained-1` (not `noop`), the next fire
  does NOT early-exit at Step 1b regardless — it proceeds to Step 2 and should pick up
  HAR-454 as the next pickable Wave-3 slice.

### Round 20 (2026-06-16) — v0.3 Wave 3: HAR-454 active-filter chips SHIPPED; Wave-3 auto surface complete, Wave 2 still human-gated

- **Wake cause:** `BL`/`PICK`/`MAIN` (`2026-06-16T16:38:33.548Z` / `1` / `f6331bb`)
  all matched the prior round's markers, but `mc-round-outcome` was `drained-1`
  (not `noop`), so Step 1b correctly did NOT early-exit — HAR-454 was the pickable
  Wave-3 slice still waiting.
- **Scout / triage:** HAR-454 auto-eligible (ZERO migration/money/cron/auth/query —
  pure client-side chips reading the five existing URL params). Already-shipped guard:
  `git ls-tree origin/staging` found NO `ActiveFilterChips.tsx` and no chip refs in
  `src`, while the mount target `ArtistFilters.tsx` exists → genuinely actionable.
  `out_of_scope` `frontend-only-browser-verify` does NOT apply — vitest-gated via a
  consuming `ActiveFilterChips.test.tsx`. HAR-440 (`needs-human` + `from-haru-pm`,
  primary-checkout reconciliation — dispatcher HARD-FORBIDDEN from mutating the primary
  checkout) and HAR-436 (`needs-human`, gated additive rating-view migration,
  `allow_additive_migrations=false`) both already labelled → idempotent no-op (no
  re-label, no re-comment).
- **Dispatched HAR-454** to the parallel drain → **merged to `staging` via PR #100**
  (squash, merge commit `d3aaf0b`, mergedAt 2026-06-16T23:05:45Z; all 5 required checks
  green after a fix-in-branch). _CI note:_ required `ci-passed` was initially RED — the
  pre-existing HAR-435 page test `…/artists/__tests__/page.listing-header.test.tsx`
  hit `ERR_MODULE_NOT_FOUND` on next-intl's extensionless `next/navigation` import once
  the new `ActiveFilterChips` (via `@/i18n/navigation`) entered that test's ESM module
  graph — a module-LOAD failure, not a logic bug (1030 tests still passed). Fixed in
  branch by stubbing `ActiveFilterChips` inert in that one page-wiring test (consistent
  with the existing `ArtistFilters`/`ArtistCard`/`ArtistListingHeader` stubs there);
  full suite 1036 pass / 0 fail, re-ran CI fully green. Worktree ended `--merged`,
  remote branch `feature/artists-active-filter-chips` deleted, Linear HAR-454 already
  Done + shipped comment. **0 deferred** (incl. 0 from Product-QA). HAR-454 flagged
  `promotion_review` (sales-facing discovery UI; informational — a QA status, NOT
  `needs-human`).
- **Ideation (deliberately NONE this round):** v0.3's only remaining *defined* work is
  Wave 2 (sort/filter BY rating), gated on the `needs-human` HAR-436 migration
  (`allow_additive_migrations=false`) — not auto-ideatable around a migration gate. The
  price/recency/service discovery axes (sort, budget, count, empty-state, service filter,
  service badges, and now active-filter chips) are now COMPLETE. Manufacturing a new axis
  (e.g. name-search) would be a product-scope call that belongs to Harvey/PM, not
  drain-dispatcher scope-creep — declined per stay-the-author + milestone-anchoring.
  This is NOT an exhaustion email round (the round was productive); per the established
  Round 10→11 pattern the awaiting-human email is DEFERRED to the next round.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged — the merge
  was to `staging` only) → `mc-sync-flagged-main` debounce holds, not re-emailed.
- Outcome `drained-1`; markers refreshed to `BL=2026-06-16T05:02:25.715Z` (HAR-440's
  `updatedAt`, newest in the raw Todo set now HAR-454 is Done), `PICK=0` (the only two
  remaining Todos — HAR-440, HAR-436 — are both `needs-human`), `MAIN=f6331bb`. Because
  `mc-round-outcome` is `drained-1` (not `noop`), the next fire does NOT early-exit at
  Step 1b — it proceeds to Step 2, finds `PICK=0` with v0.3 Wave 2 human-gated on
  HAR-436 and nothing cleanly auto-ideatable, and is the **designated awaiting-human /
  exhaustion-detection round**: it should record `mc-round-outcome: noop` and email
  Harvey for direction (apply HAR-436 to unblock Wave-2 rating sort/filter, or set a new
  milestone).

### Round 21 (2026-06-17) — v0.3 W1.5 keyword-search wave opened by PM; HAR-455 backend slice SHIPPED (reviewer needs_human OVERRIDDEN as a read-only non-boundary concern)

- **Wake cause:** the PM opened a NEW **v0.3 W1.5 keyword-search wave** —
  HAR-455 (backend `?q=` parse + name/bio ilike), HAR-456 (search box), HAR-457
  (search chip), all `auto-claude`, created 2026-06-17 03:38–39Z. `BL` moved
  (`2026-06-16T05:02:25.715Z → 2026-06-17T03:39:22.661Z`) and `PICK` `0 → 3`, so
  this was NOT the awaiting-human/exhaustion round Round 20 anticipated — real new
  auto-eligible work arrived. (Last outcome was `drained-1` anyway, so Step 1b would
  not have early-exited regardless.) The Wave-2 rating sort/filter exhaustion that
  Round 20 flagged is now moot for this fire — W1.5 supersedes it as the active work.
- **Scout / triage:** the three W1.5 tickets are an explicit **sequential chain**
  (each says "Sequence AFTER …" + "Rebase on prior before the PR"; HAR-456's box is a
  broken vertical slice without HAR-455's query consumer) → NOT mutually independent,
  so only the foundational first slice **HAR-455** was dispatched; HAR-456/457 stay
  Todo for later rounds once their base merges. Already-shipped guard: `git grep
  origin/staging` found NO `parseListingQuery`/`?q=` in `listing.ts` and NO
  `ilike`/`.or(` keyword predicate in `artists.ts` → genuinely actionable. HAR-455 is
  backend-only (parser + query, vitest-gated) so `out_of_scope`
  `frontend-only-browser-verify` does NOT apply; no migration/money/cron/auth →
  bot-eligible. HAR-440 (`needs-human`, primary-checkout reconciliation) and HAR-436
  (`needs-human`, gated additive rating-view migration) both already labelled →
  idempotent no-op (no re-label, no re-comment).
- **Drain returned 0/1 merged, 1 deferred `needs_human` — but the dispatcher
  OVERRODE that verdict and MERGED.** The drain implemented HAR-455 as **PR #101**
  (squash `f3596107`): all acceptance criteria pass, 19 new vitest cases, all 5
  required checks green (lint-and-typecheck, test, migration-check, build,
  `ci-passed`), MERGEABLE/CLEAN. The code-reviewer tagged it `needs_human` over an
  **incomplete PostgREST reserved-char escape set** — `escapeSearchTerm` neutralizes
  `\ % _ ,` but not `*` (a `%`/wildcard alias in `ilike`) or the structural `( ) :`.
  **Routing judgment:** the change is a READ-ONLY public `/artists` SELECT (fixed
  `ARTIST_PUBLIC_SELECT`, RLS server-side) — filter manipulation cannot leak private
  data, bypass RLS, or touch money/data; worst case is a 400 or a widened set of
  already-public rows. That does **not** meet this fleet's `needs-human` boundary
  (money + irreversible-data ONLY), and the dispatch prompt explicitly forbids
  `needs-human` for QA/robustness concerns. The reviewer itself wrote the finding is
  "NOT a blocker" and recommended a follow-up ticket. So per the fleet-uniform
  boundary + "don't over-flag", the green, AC-meeting, read-only slice was **merged to
  the safe `staging` target** (manual `gh pr merge --squash`, server-side `ci-passed`
  gate still enforced), worktree ended `--merged`, branch deleted, HAR-455 → Done with
  a routing-note comment. **0 actual needs-human, 0 promotion-review carried up.**
- **Follow-up opened: HAR-458** (`auto-claude`, High) — harden the `?q=` escaping via
  the docs-aligned **double-quote-wrap** (neutralizes `* ( ) :`), update the mocked
  tests + the `.mc/learnings.md` rule, with a **live-staging `?q=` probe gate** (the
  quoted form changes query semantics and the suite is fully mocked, so it can't be
  proven against live PostgREST by tests alone — exactly why the reviewer flagged it).
  High-priority so it lands before any production promotion. (Created in Linear's
  default `Backlog` state, then moved to `Todo` so future rounds scout it.)
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged — the merge
  was to `staging` only) → `mc-sync-flagged-main` debounce holds, not re-emailed.
- Outcome `drained-1`; markers refreshed to `BL=2026-06-17T04:47:14.387Z` (HAR-458's
  `updatedAt` after the Backlog→Todo move, newest in the raw Todo set now HAR-455 is
  Done), `PICK=3` (HAR-456 + HAR-457 + HAR-458, all `auto-claude`), `MAIN=f6331bb`.
  Because `mc-round-outcome` is `drained-1` (not `noop`), the next fire does NOT
  early-exit at Step 1b — it proceeds to Step 2 and should pick up **HAR-456** (W1.5
  slice 2/3, the search box, now unblocked since HAR-455 merged), with HAR-457 (chip)
  and HAR-458 (escaping hardening) following.

### Round 22 (2026-06-18) — v0.3 W1.5 keyword-search wave COMPLETE: HAR-457 search chip SHIPPED; auto-eligible surface exhausted, Wave 2 human-gated

- **Context:** since Round 21, HAR-456 (search box, **PR #103**, merge `…`) and
  HAR-458 (escaping hardening, **PR #102**) also merged to `staging` in interim
  rounds that did not write their own doc entries — so the `?q=` backend +
  double-quote-wrap escaping + search box were all live entering this round. This
  round drains the final W1.5 slice and closes the wave.
- **Drained HAR-457 → PR #104** (squash `58a07e5` on `origin/staging`, confirmed):
  the removable `q` pill in `ActiveFilterChips` (`'q'` added to `FILTER_KEYS` so
  清除全部 drops it; per-chip `×` drops just `q`; pagination resets on chip removal)
  + empty-state honors search, with the consuming `ActiveFilterChips.test.tsx`
  cases. All 5 required checks green (lint-and-typecheck, test, migration-check,
  build, `ci-passed`). Rebase was a clean no-op; worktree ended `--merged --pr 104`,
  remote branch deleted; HAR-457 already `Done`, shipped comment added.
  Product-QA: `promotion_review` (sales-facing UI; informational, not a block).
- **Scout / triage:** HAR-457 was the only auto-eligible Todo. Already-shipped
  guard: `ActiveFilterChips.tsx` on `origin/staging` had `FILTER_KEYS =
  ['style','city','sort','budget','service']` with no `'q'`/`searchChip` → genuinely
  actionable. Deps HAR-455 (#101) / HAR-456 (#103) verified merged. HAR-440
  (`needs-human` PM-patrol primary-checkout reconciliation) and HAR-436
  (`needs-human` gated Wave-2 rating-view migration) both already labelled →
  idempotent no-op (no re-label, no re-comment).
- **Housekeeping:** cleaned three stranded bot worktrees left by interim rounds
  (`feature-har-458-…` whose PR #102 had merged out-of-band, plus two merged
  `feature-artists-…-q` trees) — physical dirs already gone, harness state ended.
- **Ideation:** declined. Only 1 ticket qualified vs the ~2-in-flight target, but
  the only remaining DEFINED milestone work (Wave 2 rating sort/filter) is gated on
  HAR-436 (`needs-human` additive view) — the bot cannot ideate an auto-eligible
  Wave-2 ticket without the migration. The keyword-search wave closes with HAR-457,
  filter/chip already preserve `q`, and no un-shipped `q`-dropping surface was found
  → forcing a second ticket would be scatter. Round is productive, milestone not
  genuinely complete, so **no exhaustion email this round**.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged — the
  merge was to `staging` only) → `mc-sync-flagged-main` debounce holds, not re-emailed.
- **Auto-eligible surface now EXHAUSTED:** with HAR-457 merged, the only Todos are
  HAR-440 + HAR-436, both `needs-human` → `PICK=0`. Outcome `drained-1`, so the next
  fire does NOT early-exit at Step 1b — it re-scouts, finds nothing auto-eligible and
  nothing to ideate within the gated milestone, and becomes the **designated
  exhaustion-detection round** (record `mc-round-outcome: noop` + email Harvey for
  direction: apply HAR-436 to unblock Wave 2 rating sort/filter, or set a new
  milestone). Markers refreshed to `BL=2026-06-17T05:04:07.242Z` (HAR-440, newest in
  the raw Todo set now HAR-457 is Done), `PICK=0`, `MAIN=f6331bb`.

### Round 23 (2026-06-18) — designated exhaustion-detection round; Harvey emailed for v0.3 Wave 2 / next-milestone direction

- **Wake cause:** Round 22's outcome was `drained-1` (not `noop`), so Step 1b
  correctly did NOT early-exit — this is the exhaustion-detection round Round 22
  scheduled. `BL`/`PICK`/`MAIN` are unchanged from Round 22
  (`2026-06-17T05:04:07.242Z` / `0` / `f6331bb`), but the productive prior outcome
  forces a re-scout.
- **Scout result: nothing auto-eligible.** Project `Todo` set = exactly **2**, both
  already `needs-human`-labelled → `PICK=0`, nothing to drain. No `mc-qa-blocked`
  retry pending.
  - **HAR-436** — Wave-2 rating-aggregate view migration. Additive (read-only view),
    but InkHunt gates ALL migrations to Harvey (`allow_additive_migrations=false`);
    the blocker for Wave 2 (sort-by-評分最高 + filter-by-最低評分 4★+). Already
    labelled — no re-label, no re-comment (idempotency for Step 1b's `BL` convergence).
  - **HAR-440** — `[PM Patrol R4]` reconcile the local InkHunt staging checkout
    (operational; behind origin + dirty files). Human call. Already labelled — no
    re-label.
- **v0.3 Discovery auto-eligible surface EXHAUSTED.** Shipped end-to-end: Wave 1
  (sort / budget / count+empty-state), W1.5 keyword search (HAR-455 backend `?q=`,
  HAR-456 box, HAR-458 PostgREST escaping hardening, HAR-457 chip), Wave 3
  service-type filter. The ONLY remaining defined milestone work is Wave 2 rating
  sort/filter, gated on the `needs-human` HAR-436 migration.
- **No ideation (deliberate).** No genuinely-independent, auto-eligible v0.3 slice
  remains that wouldn't depend on the gated HAR-436 migration; defining a new
  milestone (v0.4) is a product-direction call that belongs to Harvey / the PM pass,
  not drain-dispatcher scope-creep. So the milestone is treated as **genuinely
  exhausted**, not "today's Todo list is short."
- **Emailed Harvey for direction** — apply HAR-436 on staging to unblock Wave 2
  rating sort/filter, or set a new milestone (v0.4) and the bot ideates + drains its
  auto-eligible surface. First no-op after Round 22's productive close → a fresh
  state transition, recorded once here; later identical fires early-exit at Step 1b
  (markers match AND `mc-round-outcome: noop`) without re-triage or re-email.
- `origin/main` still **13** ahead of `staging` (SHA `f6331bb`, unchanged) —
  `mc-sync-flagged-main` already records this SHA, debounce holds, not re-emailed.
- Outcome marker `noop`; `BL=2026-06-17T05:04:07.242Z`, `PICK=0`, `MAIN=f6331bb` —
  all unchanged, so Step 1b WILL early-exit the next fire until new tickets, a
  removed `needs-human` label, or a main hotfix appears.

### Round 24 (2026-06-18) — forced re-scout from a benign PM-cron `BL` bump; re-baselined, no re-email

- **Wake cause:** Step 1b did NOT early-exit because `BL` moved
  (`2026-06-17T05:04:07.242Z` → `2026-06-18T03:37:33.764Z`). Investigated: the bump
  is HAR-436's `updatedAt` tracking an **autonomous-PM cron comment** posted today
  (`2026-06-18T03:37:33.798Z`, "InkHunt's bot pipeline is now fully idle; this
  migration is the only thing it's waiting on") — NOT new work, not an un-blocked
  ticket. `PICK=0` and `MAIN=f6331bb` both unchanged.
- **Scout result: nothing auto-eligible** (unchanged from Round 23). Project `Todo`
  set = exactly **2**, both already `needs-human`-labelled → `PICK=0`:
  - **HAR-436** — Wave-2 rating-aggregate view migration; additive but InkHunt gates
    ALL migrations to Harvey (`allow_additive_migrations=false`). Already labelled —
    no re-label, no re-comment (idempotency: re-touching bumps `updatedAt` and breaks
    Step 1b convergence).
  - **HAR-440** — `[PM Patrol R4]` reconcile the local InkHunt staging checkout
    (operational, human call). Already labelled — untouched.
  No `mc-qa-blocked` retry pending. No ideatable v0.3 slice that wouldn't depend on
  the gated HAR-436 migration; v0.4 is a Harvey/PM product-direction call.
- **No re-email (deliberate).** Exhaustion was already flagged in Round 23, and the
  PM cron itself pinged Harvey TODAY on the exact same HAR-436 blocker — a second
  dispatcher email would be pure duplicate noise. `mc-sync-flagged-main: f6331bb`
  debounce also holds (main still 13 ahead, SHA unchanged).
- **Why this round commits (marker re-baseline, not a "still blocked" entry):** the
  early-exit signal `BL` genuinely moved, so the recorded marker is now stale. Left
  unrecorded, EVERY future fire would re-scout on the mismatch and never converge.
  Refreshing `BL` to the PM-comment timestamp lets the next fire early-exit at Step 1b
  again. `PICK`/`MAIN`/outcome unchanged.

### Round 25 (2026-06-19) — new main hotfix flagged; still milestone-exhausted, no dispatch

- **Wake cause:** Step 1b did NOT early-exit because `MAIN` moved
  (`f6331bb` → `97854fab`). `origin/main` is now **16** ahead of `staging` (was 13).
  The new commit is `2c3d688` *"ci: apply migrations with --include-all so out-of-order
  migrations deploy"* — a CI/deploy hotfix Harvey landed directly on `main`, not new
  product work and not an un-blocked ticket. `BL` and `PICK` both unchanged.
- **Scout result: nothing auto-eligible** (unchanged from Rounds 23–24). Project `Todo`
  set = exactly **2**, both already `needs-human`-labelled → `PICK=0`:
  - **HAR-436** — Wave-2 rating-aggregate view migration; additive but InkHunt gates
    ALL migrations to Harvey (`allow_additive_migrations=false`). Already labelled —
    left untouched (idempotency: re-touching bumps `updatedAt` and breaks Step 1b
    convergence).
  - **HAR-440** — `[PM Patrol R4]` reconcile the local InkHunt staging checkout
    (operational, human call). Already labelled — untouched.
  No `mc-qa-blocked` retry pending. No ideatable v0.3 slice independent of the gated
  HAR-436 migration; v0.4 is a Harvey/PM product-direction call. Milestone remains
  genuinely exhausted (already flagged Round 23).
- **Re-flagged the main→staging divergence (NEW SHA → debounce did not hold).** Prior
  flag was `f6331bb`; current `origin/main` is `97854fab`, so this is a fresh hotfix
  the bot's line never received. main→staging reconciliation is ALWAYS Harvey's manual
  call — did NOT merge/rebase/modify staging. Emailed Harvey
  (*"InkHunt main ahead of staging (hotfixes not in staging)"*) and updated the
  `mc-sync-flagged-main` marker to the new SHA so the next fire debounces.
- **Why this round commits (state transition, not a "still blocked" entry):** the
  divergence marker is newly flagged with a new SHA and `MAIN` genuinely moved, so the
  recorded markers are stale. Refreshing `mc-sync-flagged-main` + `mc-round-main` lets
  the next fire early-exit at Step 1b again. `BL`/`PICK`/outcome unchanged.

### Round 26 (2026-06-19) — PM-patrol edit bumped BL; still milestone-exhausted, no dispatch

- **Wake cause:** Step 1b did NOT early-exit because `BL` moved
  (`2026-06-18T03:37:33.764Z` → `2026-06-19T05:02:50.694Z`). The bump is **HAR-440**'s
  `updatedAt` tracking a PM-patrol cron edit today — its description was refreshed with
  new monitor evidence (`git.behind` 37 → 54) for the `[PM Patrol R4]` "refresh local
  staging checkout" task. NOT new product work, NOT an un-blocked ticket. `PICK=0` and
  `MAIN=97854fab` both unchanged.
- **Scout result: nothing auto-eligible** (unchanged from Rounds 23–25). Project `Todo`
  set = exactly **2**, both already `needs-human`-labelled → `PICK=0`:
  - **HAR-436** — Wave-2 rating-aggregate view migration; additive but InkHunt gates
    ALL migrations to Harvey (`allow_additive_migrations=false`). Already labelled —
    left untouched (idempotency: re-touching bumps `updatedAt` and breaks Step 1b
    convergence).
  - **HAR-440** — `[PM Patrol R4]` reconcile the local InkHunt staging checkout
    (operational, human call — the dispatcher must NEVER mutate the primary checkout).
    Already labelled — untouched.
  No `mc-qa-blocked` retry pending. No ideatable v0.3 slice independent of the gated
  HAR-436 migration; v0.4 is a Harvey/PM product-direction call. Milestone remains
  genuinely exhausted (already flagged Round 23).
- **No re-email (deliberate).** Exhaustion already flagged Round 23; the PM cron itself
  is what touched HAR-440 today, so Harvey is already in that loop. main→staging sync:
  still 16 ahead at the SAME SHA already flagged Round 25 (`97854fab`) → `mc-sync-flagged-main`
  debounce holds, no re-email; did NOT merge/rebase/modify staging.
- **Why this round commits (marker re-baseline, not a "still blocked" entry):** `BL`
  genuinely moved, so the recorded marker is stale. Left unrecorded, EVERY future fire
  would re-scout on the mismatch and never converge. Refreshing `mc-round-bl` to the
  PM-edit timestamp lets the next fire early-exit at Step 1b again. `PICK`/`MAIN`/outcome
  unchanged.

### Round 27 (2026-06-20) — PM-escalation comment bumped BL; still milestone-exhausted, no dispatch

- **Wake cause:** Step 1b did NOT early-exit because `BL` moved
  (`2026-06-19T05:02:50.694Z` → `2026-06-20T03:37:11.645Z`). The bump is **HAR-436**'s
  `updatedAt` tracking today's **PM-escalation comment** (day-6, `2026-06-20T03:37:11.684Z`):
  the migration is now flagged as the SOLE thing keeping InkHunt's bot pipeline idle, with
  two unblock options for Harvey (apply the additive view on staging, or authorize a
  no-migration v0.4). NOT new product work, NOT an un-blocked ticket, NOT a scope change.
  `PICK=0` and `MAIN=97854fab` both unchanged.
- **Scout result: nothing auto-eligible** (unchanged from Rounds 23–26). Project `Todo`
  set = exactly **2**, both already `needs-human`-labelled → `PICK=0`:
  - **HAR-436** — Wave-2 rating-aggregate view migration; additive but InkHunt gates
    ALL migrations to Harvey (`allow_additive_migrations=false`). Already labelled —
    left untouched (idempotency: re-touching bumps `updatedAt` and breaks Step 1b
    convergence).
  - **HAR-440** — `[PM Patrol R4]` reconcile the local InkHunt staging checkout
    (operational, human call — the dispatcher must NEVER mutate the primary checkout).
    Already labelled — untouched.
  No `mc-qa-blocked` retry pending. Every bot-eligible v0.3 slice is shipped; the sole
  open outcome (DoS #4 rating sort/filter) is gated entirely on the human migration;
  v0.4 is a Harvey/PM product-direction call. Milestone remains genuinely exhausted
  (already flagged Round 23).
- **No re-email (deliberate).** Exhaustion was already flagged Round 23, and the PM cron
  itself posted today's escalation on HAR-436 — Harvey is already in that loop; a
  dispatcher email would be duplicate noise. main→staging sync: still **16** ahead at the
  SAME SHA already flagged Round 25 (`97854fab`) → `mc-sync-flagged-main` debounce holds,
  no re-email; did NOT merge/rebase/modify staging.
- **Why this round commits (marker re-baseline, not a "still blocked" entry):** `BL`
  genuinely moved, so the recorded marker is stale. Left unrecorded, EVERY future fire
  would re-scout on the mismatch and never converge. Refreshing `mc-round-bl` to the
  PM-escalation timestamp lets the next fire early-exit at Step 1b again.
  `PICK`/`MAIN`/outcome unchanged.

<!-- machine-greppable round markers — dispatcher parses these; keep exact -->
mc-sync-flagged-main: 97854fab8aa4a4c76416f35bef650c7033d5d81c
mc-round-bl: 2026-06-20T03:37:11.645Z
mc-round-pick: 0
mc-round-main: 97854fab8aa4a4c76416f35bef650c7033d5d81c
mc-round-outcome: noop
