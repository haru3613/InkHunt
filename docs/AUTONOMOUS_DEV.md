# InkHunt — Autonomous Development Log

Machine-maintained by the Mission Control auto-dev dispatcher. Tracks the active
product milestone, shipped work, and per-round state markers used for the
no-op early-exit. Human-readable; the `mc-round-*` / `mc-sync-flagged-main`
marker lines below are parsed by the dispatcher — do not reformat them.

- Repo: `haru3613/InkHunt`
- Auto-dev base branch: `staging` (main / production promotion is always manual)
- Linear: team `Harveychan` (`04886110-…`), project `InkHunt` (`e80ec8b8-…`)
- Armed for auto-dev: 2026-06-06 (pilot tenant)

## Current milestone — v0.2 Reviews

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

With Round 4 the v0.2 **client-side presentational surface is complete**:
validation schema, StarRating, aggregation util (incl. per-star `distribution`),
`aggregateRating` JSON-LD, and the full component set — `ArtistReviewSummary`,
`ReviewForm`, `ReviewCard`, `ReviewList`, `RatingBreakdown` — are all shipped.
The one remaining presentational slice is an `ArtistReviewsSection` that composes
summary + breakdown + list into the final section layout (props-driven, no
DB/network) — queued as HAR-389. After that, the remaining milestone work
(Wave 3: persisted write-path + API route + page data-wiring) is genuinely
blocked on the reviews table (HAR-372, `needs-human`).

### Open / awaiting human

- **HAR-372 — reviews table migration (`010_reviews.sql`). Labeled `needs-human`
  (Round 2).** Durable policy conflict: `projects.toml` sets
  `allow_additive_migrations=false` for InkHunt, while the ticket text + the
  dispatch prompt classify additive migrations as bot-eligible — only Harvey can
  reconcile (flip the registry flag, or keep it human-owned). Independently, the
  CI `migration-check` job cannot validate any migration PR (see token note
  below) and the staging Supabase apply (`supabase db push`) needs a human.
  Labeled so future rounds skip re-triage. Harvey: (1) decide flag vs ticket;
  (2) rotate `SUPABASE_ACCESS_TOKEN`; then remove `needs-human`.

### Queued auto-eligible (Round 4 ideation, for a future round)

- **HAR-389 — `ArtistReviewsSection` presentational composition** (assembles the
  already-shipped `ArtistReviewSummary` + `RatingBreakdown` + `ReviewList` into
  one props-driven section container; no DB/network, gate-verifiable by
  `npm test`). `auto-claude`. This is the LAST presentational slice of v0.2 —
  once it ships, every remaining slice needs the reviews table (Wave 3,
  HAR-372-blocked), so the next round will likely hit genuine milestone
  exhaustion and email Harvey for direction.
- _(Round 3's queued HAR-386 / HAR-387 shipped in Round 4 — see Shipped table.)_

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
  `git.pr_view` without `repo_root`), worked around by the merge subagents
  again in Round 4 (cwd inside InkHunt + `PYTHONPATH=…/mission-control`);
  tracked for a mission-control fix.

<!-- machine-greppable round markers — dispatcher parses these; keep exact -->
mc-sync-flagged-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-bl: 2026-06-08T05:30:42.090Z
mc-round-pick: 1
mc-round-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-outcome: drained-2
