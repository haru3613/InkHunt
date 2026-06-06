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

### Open / awaiting human

- **HAR-372 — reviews table migration (`010_reviews.sql`).** Deferred by the
  dispatcher pending a policy decision: `projects.toml` sets
  `allow_additive_migrations=false` for InkHunt, while the ticket text + the
  dispatch prompt classify additive migrations as bot-eligible. Independently,
  the CI `migration-check` job cannot pass any migration PR until the migration
  is applied to the remote staging DB (a human `supabase db push`). Harvey to
  reconcile the registry flag vs the ticket and decide the migration→CI flow.
- **HAR-370 (SEO JSON-LD tests), HAR-371 (GA4 analytics tests)** — auto-eligible
  test-backfill, queued for a future round (2 in flight = ideation target).

### Onboarding flags (Round 1, 2026-06-06)

- `origin/main` is 12 commits ahead of `origin/staging`; staging is a STRICT
  ANCESTOR of main (merge-base == staging HEAD `42112ca`). Looks like onboarding
  state (staging branched at an old main point), not out-of-band hotfixes. Safe
  fast-forward available: `git push origin origin/main:staging` (reconciliation
  is always Harvey's manual call). Emailed.
- CI `migration-check` is permanently RED on every PR: `supabase link` returns
  Unauthorized — the `SUPABASE_ACCESS_TOKEN` repo secret is expired/invalid. It
  is NOT part of the required `ci-passed` gate, so it does not block code-only
  merges, but it must be rotated before any migration can be validated by CI.
- The required `ci-passed` check IS enforced server-side (via repository
  rulesets, not classic branch protection — the classic protection API returns
  404, which is expected for ruleset-based enforcement). All 3 Round-1 merges
  were gated by a green `ci-passed`.
- Harness `wt end` has a known bug (`mc/harness/cli.py:436` calls
  `git.pr_view` without `repo_root`), worked around by the merge subagents;
  tracked for a mission-control fix.

<!-- machine-greppable round markers — dispatcher parses these; keep exact -->
mc-sync-flagged-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-bl: 2026-06-06T05:58:35.310Z
mc-round-pick: 3
mc-round-main: 8b07abbcc7a3a7fc3ca048f6cf702a9d7a6f2d8d
mc-round-outcome: drained-3
