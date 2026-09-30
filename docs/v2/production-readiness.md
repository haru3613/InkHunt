# Production completion audit — 2026-10-01

This audit distinguishes the implemented MVP from unverified hosted behavior. The current v2 worktree and live provider read responses were inspected; previous test summaries were not treated as deployment evidence.

| Requirement | Current evidence | Assessment |
|---|---|---|
| Free for consumers/artists, no commission | Product copy, flows and code have no payment/subscription/paid-placement integration | Implemented |
| Discovery, guide, saves, inquiry, chat, quote and appointment lifecycle | Local real Supabase/Auth/Storage acceptance script and browser receipt | Locally verified |
| Artist application/profile/portfolio and admin review | Owner APIs, real upload/edit/delete/approval/suspension checks | Locally verified |
| Privacy and state integrity | Local migrations 019–023, participant ACL checks, rollback and concurrency SQL suites | Locally verified |
| Google-discoverable v2 | SSR pages, localized canonical/hreflang and sitemap; current ink-hunt.com deployment is still the previous site | Technical implementation complete; v2 publication/indexing not proved |
| Real LINE login | Error/session/redirect regression tests; actual provider callback registration and v2 hosted cookie round trip not exercised | External verification pending |
| LINE reminders | Next `after()` now owns async lifetime; quote acceptance notifies artist; in-app fallback and configurable follow link added | Code verified; recipient eligibility/actual delivery pending |
| Production database | Live Supabase is ACTIVE_HEALTHY, migration history 001–018, duplicate artist-identity groups = 0 | v2 migrations not applied to production |
| Delivery website | http://localhost:3200/zh-TW was re-opened and inspected | Local delivery available |

## Provider checks performed

- Vercel account access succeeds; project `inkhunt` is linked to the existing production domain `ink-hunt.com`.
- The production alias currently points to a READY deployment created on 2026-07-16, not this v2 candidate.
- Production variables have real values; Supabase public styles returned HTTP 200.
- Production LINE Messaging token returned HTTP 200 from the read-only bot-info endpoint. Its public account name is **Grok Bot**. This is a usable token, not evidence that this is the intended InkHunt Official Account or the same LINE provider as Login.
- Preview variables exist by name but their retrieved values are empty; there is no configured working remote preview database.
- Supabase has no development branch for this project.
- No live migration, deployment promotion, real user registration, Official Account follow action, or real push message was performed.

## Decisions currently requested

1. Deliver on an independent hosted acceptance URL, replace ink-hunt.com directly, or finish local acceptance first.
2. Use a dedicated InkHunt Official Account, intentionally reuse Grok Bot, or keep reminders in-app for now.

These decisions affect the public destination and connected account. They are not implied by a green unit suite or valid token. Do not silently publish v2 with local fixture accounts or direct customers to an unrelated Official Account.

## Code corrections from this audit

- Deferred notification work uses the Next request lifecycle (`after`) so Vercel can finish it after returning the response.
- Artist receives quote-acceptance/decline updates.
- LINE callback checks account provisioning, retry sign-in, identity persistence, session refresh and verified session before returning success.
- OAuth entry and callback sanitize redirect paths, including encoded/protocol-relative/backslash attempts.
- Failed login shows a retry action retaining the intended destination, instead of silently returning to a normal homepage.
- Onboarding no longer promises an unverified review turnaround or unconditional LINE delivery.
- `NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL` is optional, validated and unset until the intended account is confirmed. Users can always read updates in their conversations.

Fetched production/preview secret files were temporary and deleted after checking only presence/public host/account-name information. No credential values are stored in this receipt.
