# Artist Profile Edit Page Fixes — Design Spec

**Date:** 2026-03-29
**Scope:** 3 fixes for `/artist/profile` page

## Issues

| # | Issue | Root Cause | Files |
|---|-------|------------|-------|
| 1 | Desktop layout too left-aligned | No `mx-auto` on form container | `ProfileForm.tsx`, profile `page.tsx` |
| 2 | 擅長風格 selector empty | `/api/styles` endpoint missing | Need new `src/app/api/styles/route.ts` |
| 3 | No tests | No test files exist | Need new test files |

---

## Fix 1: Center Desktop Layout

### Problem
Page container has `p-6 lg:p-10` with no centering. Form has `max-w-2xl` but no `mx-auto`.

### Solution
- Profile page (`page.tsx`): change outer `div` from `className="p-6 lg:p-10"` to `className="mx-auto max-w-4xl p-6 lg:p-10"`
- Quick quote template section: already has `max-w-2xl`, add `mx-auto`

### Acceptance Criteria
- Form centered on desktop with comfortable max width
- Mobile layout unchanged (full-width with padding)

---

## Fix 2: Create `/api/styles` Endpoint

### Problem
Profile page calls `fetch('/api/styles')` but the route doesn't exist. The `getAllStyles()` query function exists in `src/lib/supabase/queries/styles.ts`.

### Solution
Create `src/app/api/styles/route.ts`:
- GET handler calls `getAllStyles()` and returns `NextResponse.json({ data: styles })`
- No authentication required (style list is public data)
- Handle errors with 500 status

### Acceptance Criteria
- `GET /api/styles` returns `{ data: [...styles] }`
- Profile page style selector renders all style buttons
- Style toggle works (select/deselect)

---

## Fix 3: Tests

### ProfileForm Component Test
File: `src/components/artists/__tests__/ProfileForm.test.tsx`

Test cases:
- Renders all form fields (display_name, bio, city, district, address, price range, ig_handle, booking_notice)
- Renders style buttons when styles prop is provided
- Style buttons toggle selected state on click
- Submit calls correct endpoint (POST for new, PATCH for existing)
- Shows success/error messages after submit

### Styles API Route Test
File: `src/app/api/styles/__tests__/route.test.ts`

Test cases:
- GET returns 200 with `{ data: [...] }` format
- Returns all styles from database
- Returns 500 on database error
