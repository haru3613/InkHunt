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
| 5 | 2026-06-08 | HAR-389 `ArtistReviewsSection` presentational composition (`src/components/artist/ArtistReviewsSection.tsx`, assembles `ArtistReviewSummary` + `RatingBreakdown` + `ReviewList` into one props-driven section; no DB/network; queued R4) | #86 — squash-merged to `staging` (merge commit `b8dde9e`), required `ci-passed` green (lint-and-typecheck, test, migration-check, build all passed). **LAST presentational slice of v0.2 — client-side surface is now 100% complete.** |

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

### Queued auto-eligible

- _(empty — Round 4's queued HAR-389 shipped in Round 5; see Shipped table.)_
  No further auto-eligible slices can be ideated: all remaining v0.2 work is
  Wave 3 and blocked on HAR-372 (`needs-human`). Forcing filler tickets here
  would just create DB-blocked work, so the queue is intentionally empty pending
  Harvey's direction on HAR-372 / the next milestone.

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

<!-- machine-greppable round markers — dispatcher parses these; keep exact -->
mc-sync-flagged-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-bl: 2026-06-06T17:20:57.747Z
mc-round-pick: 0
mc-round-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-outcome: noop
