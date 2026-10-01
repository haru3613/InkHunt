# Artist calendar dashboard — design QA

Source visual truth: `docs/design/artist-calendar/reference.png` (the user's selected 工作室行事曆 concept, second displayed image).

Implementation: `http://127.0.0.1:3210/zh-TW/artist/dashboard`, isolated local Supabase, signed in as the seeded InkedWolf artist.

## Comparison conditions

- Desktop CSS viewport requested: 1487×1058, devicePixelRatio 1. Source PNG: 1487×1058. Browser screenshot content: 1472×1047. Native scrollbar/capture-edge differences were excluded from alignment judgments; images were not stretched to pretend pixel equality.
- Mobile CSS viewport: 390×844; document client/scroll widths both 375 (no horizontal overflow). The saved mobile image is a full-page capture, so the fixed bottom navigation appears at its viewport position rather than at the bottom of the long image.
- State: week 2026-09-28 through 2026-10-04, selected Friday 10/02, 30-day metrics. Actual local fixtures show two visible appointments, unlike the concept's illustrative four; all counts come from the database.
- Source and final desktop screenshots were opened together in the same comparison tool input; mobile final was inspected in that same pass.

## Findings and comparison history

1. Initial desktop capture (`desktop-first.jpg`): P2 — five reply previews pushed all metrics below the first screen. Reduced the preview to two actionable rows while retaining the full count and inbox access.
2. Second/third captures (`desktop-second.jpg`, `desktop-third.jpg`): P2 — oversized empty time bands and heading spacing still clipped metric details. Reduced empty-band height, tightened the header, and retained larger appointment content where needed. Final desktop capture (`desktop-final.jpg`) shows all four metric values and their qualifying text within the reviewed viewport.
3. Initial mobile capture (`mobile-initial.jpg`): P2 local-preview issue — Next's development badge overlapped the existing bottom navigation. Set `devIndicators: false` only under the existing isolated local-harness guard; build/runtime errors remain surfaced by Next. Repeated the actual mobile appointment→conversation→overview interaction successfully and captured `mobile-final.jpg`.
4. Conversation interaction uncovered a legacy non-array quote-template value that crashed the page. Added a guarded fallback to manual quoting and a regression test. Browser verified both the correct conversation and the manual quote form after repair.
5. Independent review found a stale-request conversation race, invalid-link whole-page failure, and queue timestamp mismatch. Added abort/current-request guards, a scoped link error, and `waitingSince`. Reviewer rechecked the actual changes and passed them; focused regressions cover out-of-order responses and inaccessible links.

## Required fidelity surfaces

- **Typography:** preserved existing application fonts and wordmark; the calendar title and metrics use restrained serif hierarchy. Labels, dates, status text and long inquiry descriptions remain readable and truncated where appropriate. Deliberate differences from generated letterforms are constrained by the existing design system.
- **Layout rhythm:** retained weekly grid, selected-day tint, right-hand agenda/reply area and lower metric strip. The existing shared top navigation/mobile tabs replace the concept's new sidebar per user AGENTS.md. This is an explicit scope adaptation, not an accidental omitted sidebar.
- **Color/tokens:** warm paper, moss primary, ink text, quiet borders and distinct confirmation/proposal tones use existing tokens. No global theme or other screen was restyled.
- **Assets:** reused the project icon family. Calendar items show actual labels and a neutral appointment icon, not invented customer photos/tattoo illustrations. No fabricated images are used to stand in for private reference art.
- **Copy/content:** real counts replace illustrative 18/60%/6 values. Rate denominator and pending count are shown; cancelled appointments are excluded; no revenue or completion claims. Three-hour bands are explicitly labelled because no appointment duration exists.

Focused regions were reviewed in the readable full-resolution captures: date header/selection, appointment status cards, agenda labels, primary reply action, and the metric denominators. Additional crops were unnecessary because these regions were legible at the captured resolution.

## Interaction evidence

- Previous/next week and Today update the visible week; next-week confirmed fixture appears, cancelled fixture does not.
- Selecting a date updates its agenda without changing the statistics period.
- 7- and 90-day controls update the displayed range; server tests cover all accepted periods and Taipei midnight boundaries.
- Appointment and reply links open the correct inquiry, including older cases; mobile appointment details display the expected Taiwan time and proposed status.
- Mobile bottom navigation returns to the dashboard after hiding the local development badge.
- Error/retry and zero-denominator states have focused component tests; date selection exercised the empty-day state in the browser.
- Browser logs were inspected. The repaired application error is retained in the earlier trace; wallet-extension errors are unrelated to this app. Final post-recovery application-log check is recorded in `verification.md`.

## Limits and follow-up

No full screen-reader audit is claimed. Dense multi-appointment days expand the time bands; later duration support would permit a true proportional time-grid view. The existing inquiry list still opens its normal first page; dashboard links explicitly fetch an older selected case when necessary. No production deployment is included in this change.

No actionable P0/P1/P2 findings remain in the reviewed calendar scope.

final result: passed
