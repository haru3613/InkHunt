# Calendar verification receipt — 2026-10-01

## Environment and source

Feature branch `feat/artist-calendar-dashboard`, based on production main `3893653`. Local preview uses Node 22, Next 16.2.1, port 3210 and the existing isolated Supabase API 56321/Postgres 56322. Installed dependencies/lockfile are unchanged. Local push notifications remain disabled by the existing harness guard; no production data or provider configuration changed.

## Completed checks

- `npm run test:unit -- --maxWorkers=2`: 189 files / **1,723 tests passed**. Coverage: 88.35% statements, 80.53% branches, 82.15% functions, 90.41% lines. Existing thresholds retained.
- Focused dashboard/inbox/API/date suites: **35 tests passed**, including stale A→B responses, malformed template fallback, invalid-link notice, quote-version deduplication, zero denominators, and more than 1,000 owner-scoped rows.
- `npx tsc --noEmit`: passed.
- `npx eslint src/`: zero errors, 11 existing warnings.
- `node scripts/calendar-acceptance.mjs`: **20 real HTTP checks passed**; repeated run reused the four persisted calendar fixtures instead of adding duplicates. Final successful rerun followed infrastructure recovery. Detailed receipt: `http-acceptance.json`.
- Real HTTP checks cover guest denial, consumer denial, invalid parameters, cross-artist isolation, persisted confirmed/proposed/cancelled appointments, selected-week changes and correct counts above 20 inquiries.
- Chrome desktop/mobile interactions and source comparison passed; see root `design-qa.md`, `desktop-final.jpg`, `mobile-final.jpg`, and `mobile-conversation.jpg`.
- Final browser reload and interaction log check found no new application errors; Chrome wallet-extension errors were excluded. The temporary viewport override was reset and the working dashboard tab was retained for review.
- Final additions keep build-time dates out of static HTML and hide only the local development badge. The dashboard-focused suite passed 7 tests afterward; TypeScript and affected lint checks passed. The remote PR run will cover the final combined source and production build.

## Retained failed attempts and recovery

During browser verification the machine exhausted free disk space. Docker returned container filesystem I/O errors; local Auth later returned `Database error querying schema`, and an HTTP rerun failed at local login. After Docker recovery, the preview encountered a damaged/empty Next manifest. These were not counted as passing tests.

Recovery preserved database volumes/accounts/fixtures. Only the Docker runtime and the affected 3210 preview were restarted; regenerable cache from the inactive parent checkout was removed. The original 3200 preview stayed available. Subsequent direct Auth/artist-login/dashboard checks passed, four consecutive health probes succeeded, free disk recovered to about 3 GB, and the full 20-check HTTP acceptance passed again.

A browser path also exposed malformed legacy quote-template data; the client now keeps manual quoting available instead of calling `.map` on a string. The corrected page and manual quote form were re-opened successfully.

## Publication boundary

This is a locally verified feature. The production v2 release remains separate; this calendar is not claimed deployed until a future release receipt establishes that. Remote build/CI results belong to the PR and exact source SHA; a green Vercel skipped-preview status is not a deployment receipt.
