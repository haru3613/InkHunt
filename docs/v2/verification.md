# InkHunt v2 acceptance receipt

Environment: isolated local Supabase `inkhunt-v2`, API 56321, Postgres 56322; Next.js 16.2.1 on Node 22.23.1. Clean dependency installation used npm 11.6.2 and the checked-in lockfile. Production LINE credentials were not copied; all local notification requests are disabled with the exact local-harness guard.

## Reproduce

```bash
npx --yes npm@11.6.2 ci
./scripts/v2-supabase-up
./scripts/v2-supabase-seed
./scripts/v2-dev
npm run test:v2:acceptance
npx eslint src/
npx tsc --noEmit
npm run test:unit -- --maxWorkers=2
# Stop the dev server before sharing its .next output with a build.
NODE_OPTIONS=--max-old-space-size=2048 npm run build -- --webpack
```

Local SQL verification:

```bash
psql postgres://postgres:postgres@127.0.0.1:56322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/019_transactional_inquiries_quotes.sql
psql postgres://postgres:postgres@127.0.0.1:56322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/023_atomic_quote_request_fanout.sql
```

## Actual results

- Full suite: 182 test files / 1,681 tests passed. Coverage: 88.15% statements, 80.42% branches, 80.92% functions, 90.07% lines; original coverage thresholds retained.
- Final additional realtime quote-state regression: 19 tests passed. Focused quote-reload/appointment/UI regression: 50 tests passed. No snapshot or mock result is presented as live database verification.
- TypeScript: passed. ESLint: zero errors; existing/ref-cleanup warnings remain.
- Production webpack build passed. Discovery is dynamic SSR so approval/suspension and viewer saves are not frozen at build time.
- `next start --port 3201`: homepage 200, working localized sitemap, no development account picker, development-login endpoint 404.
- Real authenticated HTTP acceptance: 48 checks passed in the final run; see `evidence/acceptance.json`. Exercises private upload bytes, uploader/participant/outsider ACL, persisted inquiry/messages, quote settlement, appointment proposal/confirmation/cancellation, closure cancellation, pending owner profile/portfolio CRUD, admin approval/suspension and duplicate artist prevention.
- Real SQL rollback and lifecycle assertions passed. Two concurrent sibling-quote accepts produced exactly one success: parent accepted, one inquiry accepted/one closed, one quote accepted/one rejected.
- Live RLS checks passed for consumer, artist, outsider, pending owner and anonymous reads. Public identity columns are inaccessible through PostgREST; permitted public columns remain readable.

## Browser evidence

Chrome controlled through the built-in browser tool. Requested desktop viewport 1536×1024; mobile viewport 390×844. Browser DOM confirmed 390px viewport / 375px scroll content width, without horizontal overflow. No headless browser fallback was used for the visual review.

- `evidence/home-desktop.jpg`: production build, populated real local database gallery.
- `evidence/home-mobile.jpg`: production build mobile layout.
- `evidence/guide-mobile.jpg`: actual subject/location guide with preserved selection and filtered result URL.
- `evidence/inquiry-review.jpg`: actual three-step inquiry review.
- Browser-created inquiry `fd3f480f-e3ca-48ee-8822-9535049afb28`: real consumer submission, chat send, quote acceptance and appointment confirmation. Quote/proposal preconditions were created through the service RPCs; the consumer actions used the actual mobile UI. SQL confirmed `confirmed | 2026-10-20 14:00:00` in Taipei time. `evidence/booking-confirmed-mobile.jpg` shows the result.

Image inspection used `view_image` on both `concepts/discovery.png` and the latest `evidence/home-desktop.jpg`. Compared hero copy/hierarchy, serif wordmark and Chinese typography, paper/moss palette, two-column hero/media framing, four-column artwork grid, gutters/buttons and mobile continuation. Kept UI text native. There are no added hero eyebrow labels or fake trust metrics. Intentional changes are listed in `assets.md`: real data instead of concept identities, inquiry navigation, free-service copy and editorial image disclosure. The image is a design reference, not a user-approved pixel-exact screenshot contract.

## Rollout boundary

This is a locally verified MVP candidate, not a production deployment receipt. Remaining environment verification: real LINE OAuth callback and cookie round trip, real LINE push delivery, production Storage/RLS after migrations, deployed domain/canonical URLs, Google indexing/Search Console. No external publishing, production DB mutation, or real user notification occurred in this task. Google ranking and supply acquisition are not guaranteed by technical SEO.


## Follow-up production audit (2026-10-01)

- Source checkpoint: `e38a262` (full v2 MVP plus notification/OAuth reliability fixes).
- Updated full suite: 185 files / 1,706 tests passed; 88.22% statements, 80.30% branches, 81.52% functions, 90.09% lines. Original thresholds retained.
- `npx eslint src/`: zero errors; `npx tsc --noEmit`: passed.
- `npm run test:v2:acceptance`: 48 real HTTP checks passed again after deferred notifications were introduced; local pushes remained disabled.
- A detached build-only worktree at `e38a262`, with no `.env.local` and exactly the public placeholder variables from CI, passed plain `npm run build` using Turbopack (8.5s compilation, 58 static pages). Missing database-secret reads degraded as designed; real database behavior is covered by the separate HTTP/SQL receipts. The build-only worktree was removed after completion.
- Browser inspected `?auth_error=callback_failed&returnTo=...`: readable recovery alert and retry link preserve the original inquiry destination. Screenshot: `evidence/auth-recovery.jpg`.
- Actual cloud checks and unresolved account/destination decisions are in `production-readiness.md`. No v2 deployment or production migration is claimed.
