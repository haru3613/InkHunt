# Artist calendar dashboard

The user selected the second displayed concept, 工作室行事曆, on 2026-10-01. `reference.png` is the exact selected image. This implements the artist dashboard and its data, not a new onboarding flow or a public-site redesign.

## Behavior

- Browse Monday–Sunday weeks, return to today, and select individual days in Asia/Taipei.
- See confirmed and proposed appointments, with cancelled appointments excluded.
- Open an appointment or reply action directly in its authorized inquiry conversation, including cases older than the first inbox page.
- Switch between 7/30/90-day intake metrics. The period ends today and is independent of the calendar's selected week.
- Show truthful empty, loading and retry states. A database failure is not represented as zero.
- Keep profile setup and review status visible for artists without portfolio work.

## Metric contract

`GET /api/artist/dashboard` derives the artist from the verified session. It does not accept caller-supplied artist ownership. Responses are private/no-store. Queries paginate past both the old 20-row inbox and PostgREST's row limit, and batch related rows by owned inquiry IDs.

New inquiries are the inquiries created within the rolling period. Quoted/accepted counts use that same inquiry cohort and deduplicate quote versions by inquiry. The displayed acceptance rate is rounded to a whole percent; a zero denominator is null, displayed as a dash. Awaiting response counts only unresolved latest sent/viewed quote states. The period's confirmed appointments use appointment start dates, not decision time or work completion. Upcoming confirmed appointments run from now to the start of the Taipei day seven days after today.

Reply priority uses the latest consumer message after the latest artist response, or an inquiry with no artist response, excluding closed inquiries. Displayed waiting time uses the same latest-consumer timestamp. Unread badges count consumer messages only.

## Scope and intentional visual adaptations

- Preserve the existing shared top navigation and mobile tabs, as required by the user's AGENTS.md. The concept's new global sidebar was not introduced.
- Reuse existing fonts, palette, Button/Select components and the project's Lucide icon family. No new font or icon dependency is added.
- Calendar cells group starts into labelled three-hour bands. Appointment data has no duration, so card height never claims a treatment length. Early/late appointments expand the visible bands rather than disappearing outside office hours.
- Use actual appointment text and status icons; do not invent client tattoos, photos or durations to match decorative concept imagery.
- Show two reply previews with the full queue count and access to the existing inbox, keeping the primary metrics visible on desktop.
- On mobile, use the seven-day date selector and selected-day agenda, avoiding a compressed unreadable hourly grid.
- Sample records used for verification live only in the isolated local database and are named 行事曆驗收. The application does not ship fixed mock statistics.

## Related correctness fixes

The inbox now cancels and ignores stale requests when a calendar deep link changes. An invalid or inaccessible deep link leaves the normal list available with a scoped notice. A legacy non-array quote-template response falls back to manual quoting instead of crashing the conversation screen.

## Local review

The preview runs at `http://127.0.0.1:3210/zh-TW/artist/dashboard` against the existing isolated Supabase project on ports 56321/56322. Production credentials and real LINE pushes are not used. Sign in through Dev Login as InkedWolf when needed.

Run `node scripts/calendar-acceptance.mjs` for the local HTTP checks. The script verifies the local-harness guards, preserves existing data, reuses its recorded fixtures, and saves a redacted receipt to `http-acceptance.json`.
