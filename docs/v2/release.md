# InkHunt v2 release candidate — 2026-10-01

Status: **prepared for integration review; NO-GO for production promotion yet**.
The user approved the local v2 experience and requested release preparation. This is not authorization to merge main, mutate production, or promote a deployment.

## Scope and source

- Approved product source: `e38a262`; local review checkpoint: `1a85fb0` on `feat/inkhunt-v2`.
- Free discovery, guided matching, saves, artist registration/portfolio, private inquiries, chat, quotes, and appointment coordination. No platform fee or payment processing.
- Integration target: `staging`; proposed eventual production destination: existing `https://ink-hunt.com`. Confirm the cutover before executing it.
- Since `e38a262`, only release documentation and the macOS preview launcher changed. This preparation additionally hardens CI aggregation; it does not change the approved UI or application behavior.
- User selected the existing **Grok Bot Messaging API** account. After release, rename it **InkHunt** and redesign the InkHunt icon. Do not create a replacement channel or rotate identities merely to change branding.
- Release acceptance includes actual LINE login on the production domain and a received push to a designated test account. An OAuth redirect or Messaging API HTTP 200 alone is insufficient.

## Evidence and current inventory

| Boundary | Evidence | Limit |
|---|---|---|
| Product and local security | [Verification receipt](verification.md): 1,706 tests, 48 authenticated HTTP checks, SQL lifecycle/concurrency/RLS checks; clean build at `e38a262` | Existing unchanged-code evidence, not rerun or represented as current hosted verification |
| User review | Explicit local version approval in this session | Production/provider acceptance remains separate |
| Preview recovery | Homepage and explore HTTP 200; visible Chrome homepage; regenerated valid Next manifest | Local test database and development login only |
| CI aggregation preparation | `actionlint .github/workflows/ci.yml .github/workflows/deploy.yml`; 1,024 result combinations passed against the actual shell block | Remote candidate CI must finish on the PR |
| Production application | `vercel inspect https://ink-hunt.com`: READY `dpl_GZ2qmNDTgH2crsXhRyNiHbGuV8Nv`, created 2026-07-16 | Old site, not v2 |
| Database | Live project `ktpckytlascxwjsivnym`, ACTIVE_HEALTHY; migrations 001–018; duplicate non-null artist LINE identity groups = 0 | Recheck while writes are paused before migration |
| Storage | Live buckets avatars, portfolio, inquiries currently public | Migration 020 must make inquiries private; old public URLs then require the v2 media route |
| Hosting settings | CLI `vercel project inspect inkhunt`: `prj_zi4eNF78QJJgvQMDW4DN8hPbGiSP`, dashboard Node 24.x / framework Other | Candidate declares Node 22 and Next.js; inspect effective build settings and align before hosted build |
| Credentials | `vercel env ls production`: expected variable names present; no secret values copied or committed | Presence is not validity; Official Account follow URL is not configured |
| Remote history | Latest existing CI covers `448f3d9`, not v2; main-only extra commits are merge commits | Candidate must get its own CI; do not infer it from staging history |

Vercel connector inventory did not expose InkHunt in this session; the authenticated CLI did. Use the project ID above and verify the linked project before any mutation. Never select the unrelated CardDex project returned by the connector.

Release preparation opened [PR #197](https://github.com/haru3613/InkHunt/pull/197). Its first CI run ([36795546555](https://github.com/haru3613/InkHunt/actions/runs/36795546555)) passed lint/typecheck but found one timing-dependent test failure: the quote comparison test waited for an always-visible heading before checking asynchronously loaded quotes (1,705 passed / 1 failed). The test now waits for the actual count/total content; product code is unchanged. The failed run remains part of the evidence, and the repaired candidate requires fresh remote CI. The PR migration job skipped remote drift checking because `SUPABASE_REMOTE_ENABLED` is unset. Vercel's green GitHub status corresponds to a canceled preview (`dpl_7KFzC4SoEFPv846xojcoNsYc3jTP`), not a working hosted artifact.

Additional live read-only preflight: inquiries = 0, quote_requests = 0, messages = 0; inquiry Storage objects = 2, both matching the v2 two-segment image-path shape. The new appointments table, unique artist-identity index and inquiry-creation RPC are absent, as expected for history ending at 018. Preserve both objects. The local seed contains some JSONB string `"[]"` values instead of arrays; do not treat fixture acceptance as a production-data upgrade rehearsal. Recheck reference shapes and object existence if production data changes before cutover.

## Cutover plan (execution pending approval)

1. Finish PR CI and integrate to staging. Record the final commit and the release diff, including the two staging changes since main. Prepare the exact hosted artifact with production-equivalent settings; exclude local `.env` files, `INKHUNT_LOCAL_TEST`, dev login, and seed scripts.
2. Resolve deployment ordering **before main merge**. Current `deploy.yml` and Vercel Git integration run independently on main push; neither proves migrations complete before traffic switches. Temporarily suspend automatic production promotion/migration triggers under the approved release procedure, or replace them with a verified sequential path. Retain the old deployment ID and configuration snapshot. No main push while this race remains.
3. Establish a tested maintenance/write-pause method for both application/API traffic and direct client writes. Capture a restorable database backup covering application data, auth, schema/policies and migration history, plus a separate inventory/backup of Storage object bytes. Restore into an isolated target and check counts, sample bytes, identities and ACLs. Record backup identifiers and the recovery owner privately, never commit customer data or credentials.
4. With writes still paused, recheck duplicate artist identities, schema history and legacy inquiry reference paths. Apply reviewed migrations 019–023 in order using the normal migration mechanism. Do not run local seed/reset scripts or mark migrations applied without executing them. Check actual schema, privileges, policies and the private bucket after each step; stop on failure.
5. Activate the verified v2 artifact against the migrated database in the controlled window. Validate public discovery/canonical/sitemap, no test identities, dev-login 404, owner/admin permissions, private media for participants and rejection for outsiders, quote/appointment lifecycle, and the LINE checklist below before declaring release successful.
6. Reopen writes only after checks pass. Observe runtime errors and notification failures. Preserve the maintenance/recovery path until the acceptance receipt is complete. Restore normal deployment triggers only after the safe order is established.

## Recovery

- Before any migration: abort and leave the old application/database pair serving; no restore is needed.
- After migrations begin: keep writes paused. Prefer a forward fix preserving private inquiry storage and tightened identity grants. An application-only rollback to v1 is unsafe because v1 assumes the old storage/column access contract.
- If full rollback is unavoidable: restore the matching pre-cutover database/auth/schema/migration-history and Storage snapshot, pair it with the captured old application artifact/configuration, verify privately, and obtain explicit approval before any recovery that would reopen previously private media. Account for any post-snapshot writes before restore; never silently discard them.
- No automatic down migrations are provided. A documented plan does not prove backup availability, restore success, or a working maintenance switch; these remain release blockers until exercised.

## LINE acceptance and post-release branding

1. Confirm the InkHunt Login channel and selected Messaging API channel belong to the same LINE provider; inspect channel IDs, Published status and the exact `https://ink-hunt.com/api/auth/line/callback` entry. Do not expose channel secrets in evidence.
2. Verify the deployed credential mappings, configured base URL, Supabase auth settings and production cookie behavior. Exercise fresh sign-in, returning sign-in, protected-destination return, refresh/session persistence, logout, cancellation and retry from an error.
3. Confirm the test user follows the selected Official Account and has not blocked it. Use a single explicitly designated recipient; never broadcast to existing Grok Bot followers as a release test. Validate quota, then exercise an actual supported application event and confirm receipt on the user's phone, correct copy and working InkHunt deep link. Check the in-app conversation and failure reporting as well.
4. After technical release, redesign the icon and rename the selected Official Account from Grok Bot to InkHunt as requested. Update the corresponding Login channel icon where appropriate; keep channel IDs/provider unchanged. Verify the visible account/profile and the next test notification, and configure the actual Official Account follow URL.
5. Record actual timestamp, deployment SHA, redacted account/channel identifiers, device/browser, login result and recipient-confirmed delivery. Mark release complete only after the required hosted outcomes are observed; branding completion has its own receipt.

LINE user IDs are provider-scoped; matching provider IDs allows Login and Messaging to address the same identity. See [LINE user IDs](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/) and [push API](https://developers.line.biz/en/reference/messaging-api/#send-push-message). Database backups do not contain Storage object bytes; see [Supabase backups](https://supabase.com/docs/guides/platform/backups).

## Remaining release blockers

- Candidate remote CI and final source/artifact identity.
- Proven sequential cutover, maintenance method, database/Storage backup and recovery rehearsal.
- Production migrations 019–023 and hosted privacy/lifecycle verification.
- Real LINE login and recipient-confirmed push; channel/account mapping and test recipient still require verification.
- Explicit approval for the concrete production cutover. Icon redesign/account rename is scheduled after release, not silently performed during preparation.
