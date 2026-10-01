# Local preview performance verification

Measured 2026-10-01 against the isolated local Supabase instance on port 56321.
No production database, deployment or provider setting was changed.

## Changes and validation

- Auth initialization uses the SDK's initial-session event, coalesces automatic refreshes, and rejects stale responses after logout, identity change or unmount. Browser network observation on authenticated dashboard reloads found 3 `/api/auth/me` requests before and 1 after. The endpoint remains the authority for application identity and roles.
- Only exact `GET /api/styles` skips session refresh. Its response explicitly selects public style fields, uses browser max-age 60 seconds and Vercel CDN max-age 300 seconds with 60 seconds stale-while-revalidate. Database failures return an uncached 500; private dashboard data stays `private, no-store`.
- `vercel.json` requests `hnd1` for future deployments, near the existing Tokyo database. This configuration has not been deployed or measured in production.
- Product commit `bb0a2732ca0a8ab5d2353503bbf7083df4512ba7` passed [remote CI](https://github.com/haru3613/InkHunt/actions/runs/36817596656): 189 test files / 1,735 tests, lint, typecheck and production build. Local focused tests and independent security review also passed.

## Measurements

Both before/after servers used production builds on this machine and the same local database. Baseline port 3211 was commit `7bb4d75`; optimized port 3212 was `bb0a273`. Each route received 7 sequential requests; the warm median excludes the first. Raw samples are in [local-preview-measurements.json](./local-preview-measurements.json).

| HTTP response | Before warm median | After warm median |
| --- | ---: | ---: |
| Dashboard page | 26.5 ms | 25.2 ms |
| Dashboard API | 59.2 ms | 63.5 ms |
| Auth identity API | 55.6 ms | 60.3 ms |
| Public styles API | 28.3 ms | 8.5 ms |

These small local samples support fewer auth requests and a cheaper styles request. They do not establish a dashboard API speedup, browser paint improvement, CDN hit rate or hosted regional improvement.

The earlier [dev-vs-prebuilt.json](./dev-vs-prebuilt.json) recorded first observed dashboard page/API responses of 1,403.7/2,451.1 ms in the optimized development server versus 206.4/114.6 ms in the baseline production build. This compares different source commits and runtime modes; it illustrates compilation overhead, not an isolated code-change benchmark. It is not a fresh-machine cold-start test.

## Review runtime

The user-facing preview at <http://127.0.0.1:3210/zh-TW/artist/dashboard> now runs `next start`, using an immutable build of `bb0a273` in `.worktrees/inkhunt-review-runtime`. The login-session launchd job is `com.harvey.inkhunt-artist-calendar-review`; inspect it with `launchctl list com.harvey.inkhunt-artist-calendar-review`. Logs are `/tmp/inkhunt-calendar-review.stdout.log` and `/tmp/inkhunt-calendar-review.stderr.log`. Do not remove this worktree while the job is active. This is not a reboot-persistent LaunchAgent.

The isolated development helper at port 3200 remains available for fixture sign-in; production mode on 3210 intentionally has no dev-login endpoint. Cookies on `127.0.0.1` work across these ports. The authenticated dashboard and week navigation were verified in the browser after the switch. Temporary comparison servers on 3211/3212 were stopped and the unused baseline worktree removed.

To reproduce timings, prepare separate builds at the stated commits, run both against the isolated database, then run `node scripts/measure-preview.mjs http://127.0.0.1:3211 http://127.0.0.1:3212`. It validates local URLs and the local environment, signs into the fixture through port 3200, keeps cookies only in memory and replaces the raw measurement JSON.

Provider references: [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region), [Vercel cache-control headers](https://vercel.com/docs/caching/cache-control-headers).
