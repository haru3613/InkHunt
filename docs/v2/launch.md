# V2 launch handoff

## Product scope

Free artist registration and consumer discovery/inquiry/appointment coordination. No payment processing, commission, subscription or paid placement. Artists propose a time and location after quote acceptance; consumers confirm. There is no public instant-availability calendar or payment/deposit collection. Both participants can cancel a proposed/confirmed arrangement; closing the inquiry cancels any active arrangement and preserves history.

## Before promotion

1. Use the v2 worktree and npm 11.6.2. Run the commands in `verification.md` against an isolated staging database.
2. Back up the target database. Compare its migration history with this repository. Migration 019 intentionally refuses duplicate non-null `artists.line_user_id`; reconcile duplicates deliberately rather than deleting rows automatically.
3. Coordinate application deployment with migrations 019–023 in a short maintenance window. The private media and public-column grants change old client assumptions; do not leave v1 running against the partially migrated schema.
4. Apply the checked-in SQL through the normal Supabase migration workflow. Do not mark migrations applied without executing them. Never run the local seed or `db reset` against production.
5. Configure real environment values for Supabase, LINE Login, LINE Messaging, admin identities and the public HTTPS `NEXT_PUBLIC_BASE_URL`. Do not deploy `.env.local`, `.env.test.local`, local-dev LINE values, local test accounts, or `INKHUNT_LOCAL_TEST=true`.
6. Verify LINE callback URL in the provider console; verify guest browsing, consumer login, artist application, admin approval, public visibility, upload ACL, chat, quote settlement, appointment confirmation and cancellation on the deployed domain.
7. Confirm `/api/auth/dev-login` returns 404, private reference media is not publicly readable, and anonymous clients cannot read private identity/address columns.
8. Check localized canonical/hreflang URLs and sitemap on the live domain. Submit the sitemap in the existing Search Console property. Indexing is an observed outcome, not a build result.

## Acceptance accounts

Use the development-only **Dev Login** picker. 小美 is a consumer, InkedWolf is an approved artist, New Talent is pending, Harvey is the admin. Test names and seeded artwork are explicitly labeled. API acceptance creates additional 【驗收】 records and suspends its temporary artist at the end; they remain only in local test storage.

## Runtime operations

On macOS, run `scripts/v2-preview start` to serve the local review at `http://127.0.0.1:3200/zh-TW`, `scripts/v2-preview status` to check its process and HTTP response, and `scripts/v2-preview stop` to stop it. The launchd job survives the agent terminal closing for the current login session; run start again after logout/reboot. It requires the local environment, installed dependencies, and the local database stack below. Logs are in `/tmp/inkhunt-v2-preview.{stdout,stderr}.log`.

Use `scripts/v2-supabase-down` to stop only the local v2 services while preserving its volume. `scripts/v2-supabase-up` starts the minimum required stack; Studio/mail/edge/logging extras are omitted. This machine required clearing regenerable build/package caches and reducing build workers to two due disk/swap pressure. Project files and existing shared database volumes were retained.
