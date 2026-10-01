# Onboarding recovery verification

Scope: repair the production onboarding findings recorded on 2026-10-01. The production test application remains pending and untouched. All mutations in this verification use the isolated local Supabase API on port 56321 with notifications disabled.

## Behavior

- Await an authoritative identity refresh before exposing post-submit navigation. A failed refresh can retry without creating a second profile; a lost create response can recover the owned profile on conflict.
- Persist account-scoped form fields, current step and selected File bytes in IndexedDB. Drafts expire after seven days. Storage failure is visible; completion clears the draft. A Web Lock prevents two same-account tabs from overwriting each other.
- Persist upload checkpoints and stable UUIDs before uploads. The owned portfolio endpoint uses the UUID as its primary key and returns an existing row on retry or concurrent insert conflict. It never reveals another artist's row. Stop remaining uploads if the browser cannot save a successful-file checkpoint.
- Clarify required fields, reference starting prices, optional Instagram/upper bound, submission choices and pending-review copy. Associate labels and city pressed states; compact style choices; keep the style page actions visible; add a submission summary.
- Cancel submission/upload requests when the account-scoped wizard unmounts.

## Evidence

1. Red reproduction: the unfixed Wizard failed the identity-refresh regression (1 failed / 15 passed) and the draft-remount regression. Fixed Wizard/hook tests cover restoring text and selected file bytes, account separation, blocked storage, completion cleanup, sync retry, checkpoint failure and lost-create recovery.
2. Real AuthProvider + onboarding page + portfolio page integration test passes: submit with no photos, refresh identity, click continue, and reach the actual portfolio manager without reloading.
3. Full local suite before the final checkpoint/recovery refinements: 191 files / 1,769 tests passed, coverage 88.45% statements / 80.78% branches / 83.13% functions / 90.87% lines. The refinements passed the affected 40-test suite. Remote CI must verify the final committed tree.
4. Typecheck passed; full lint has 0 errors and 11 existing warnings. Impeccable's mechanical detector returned no findings for the changed onboarding components.
5. Browser (Chrome, actual local database): selected a local test image, reloaded at step 4, and observed the same name, city, prices, style and image. Submitted, then clicked continue and reached portfolio management with one saved item without a reload. Phone viewport width and scroll width both 390 px.
6. Cross-tab browser check: the second same-account tab displayed the editing-lock explanation; closing it left the first draft intact. An initial check during hot reload transferred ownership to the newly mounted tab; the stable-version recheck confirmed the intended single-writer behavior.

Screenshots in this directory record desktop/mobile styles, restored mobile draft, cross-tab protection and successful handoff. `http-acceptance.json`, when present, records the real local API idempotency, ownership and price-validation checks.

## Operational evidence and limits

The development server's compilation slowed severely under host memory pressure (swap about 25 GiB). The first API acceptance attempt was stopped while switching this task's preview to a production build; no acceptance fixture row had been created. Other projects and the production site were not stopped. The production-mode review uses port 3220; the existing guarded development helper on port 3200 provides fixture sign-in against the same local database.

Selected image bytes stay only in this browser's local IndexedDB until submission. Clearing site data or browser storage eviction can remove drafts; an unavailable store is never reported as saved. A lost Storage-upload response may leave an orphan object because the existing signed-upload endpoint generates random paths. Stable portfolio row IDs prevent duplicate portfolio entries; this change does not claim exactly-once Storage writes or cleanup historical orphan objects.

No production deployment or admin approval is part of this repair. Shared navigation, public discovery and the calendar dashboard are preserved.
