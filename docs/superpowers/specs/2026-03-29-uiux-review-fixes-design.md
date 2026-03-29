# UI/UX Review Fixes — Design Spec

**Date:** 2026-03-29
**Scope:** P0 + P1 issues from production UI/UX review
**Branch:** TBD (will create from staging)

## Issues Overview

| Priority | Issue | Root Cause | Files |
|----------|-------|------------|-------|
| P0 | English route shows Chinese | Investigate middleware/locale; hardcoded city names | `ArtistFilters.tsx`, `messages/*.json`, `middleware.ts` |
| P0 | Style counts all 0 | `getAllArtistCounts()` query or missing data | `styles.ts`, `StyleGrid.tsx` |
| P1 | Artist cards no portfolio preview | `ArtistCard` doesn't render portfolio thumbnails | `ArtistCard.tsx` |
| P1 | Artist profile empty on desktop | Single-column vertical stack | `artists/[slug]/page.tsx`, `ArtistProfile.tsx` |
| P1 | Mobile bottom nav hidden on homepage | z-index stacking context conflict | `MobileNav.tsx`, homepage hero |

---

## Fix 1: i18n English Route (P0)

### Problem
`/en` routes show Chinese text despite:
- Translation files (`messages/en.json`) being fully populated
- Components using `t()` from next-intl correctly
- Locale routing configured properly

City names in `ArtistFilters.tsx` are hardcoded Chinese.

### Solution
1. Debug middleware to confirm locale propagation on `/en`
2. Check if `getTranslations()` receives correct locale
3. Move `CITIES` array from hardcoded Chinese to translation keys:
   - Add `artists.cities.*` keys to both `messages/en.json` and `messages/zh-TW.json`
   - Map city slugs to translated display names
4. Test all pages under `/en` route

### Acceptance Criteria
- `/en` shows English hero, nav, footer, style labels, city names
- `/zh-TW` continues to show Chinese
- No mixed-language text on any page

---

## Fix 2: Style Category Artist Counts (P0)

### Problem
All 21 style categories show "0 位刺青師" despite at least 1 artist existing.

### Root Cause Options
- A: `getAllArtistCounts()` Supabase query returns unexpected data shape
- B: `artist_styles` table has no rows linking the test artist to any style

### Solution
1. Check `artist_styles` table for data — if empty, this is a data issue
2. If data exists, fix the query:
   - Simplify to: `supabase.from('artist_styles').select('style_id').eq('artists.status', 'active')`
   - Or use a direct count query grouped by `style_id`
3. Verify counts appear correctly on homepage

### Acceptance Criteria
- Style cards show correct non-zero counts when artists have linked styles
- Count updates when new artist-style links are added
- "0 位刺青師" only shows for styles with genuinely no artists

---

## Fix 3: Artist Card Portfolio Thumbnails (P1)

### Problem
Artist listing cards show only name + city + price. No visual preview of their work.

### Solution
Add a thumbnail strip to `ArtistCard`:
- Show up to 3 portfolio images from `artist.portfolio_items`
- Use `thumbnail_url ?? image_url` for each item
- Layout: horizontal row below the artist info
- Styling: `aspect-square`, `object-cover`, `border-radius: 0px` (DESIGN.md: sharp edges for art)
- If no portfolio items, don't show the strip (no placeholder)
- Use Next.js `<Image>` with appropriate sizes

### Visual Spec
```
┌─────────────────────────────┐
│ [Avatar]  Artist Name       │
│           City              │
│           Styles...         │
├─────────────────────────────┤
│ [img1] [img2] [img3]       │  ← new thumbnail strip
├─────────────────────────────┤
│ NT$X,XXX 起    + 加入比較   │
└─────────────────────────────┘
```

### Acceptance Criteria
- Artist cards show up to 3 portfolio thumbnails
- Images load via Next.js Image optimization
- Cards without portfolio items look clean (no empty row)
- 0px border-radius on thumbnails

---

## Fix 4: Artist Profile Two-Column Desktop Layout (P1)

### Problem
Desktop profile page is single-column `max-w-4xl` with lots of empty space.

### Solution
On `lg:` breakpoint, switch to two-column layout:
- **Left column (~1/3):** Artist info card (sticky), CTA button, compare button
- **Right column (~2/3):** Portfolio grid
- Container: `max-w-6xl` (up from `max-w-4xl`)
- Mobile: keep current single-column stack

### Visual Spec (Desktop)
```
┌──────────────┬──────────────────────┐
│ [Avatar]     │ 作品集               │
│ Artist Name  │ ┌────┬────┬────┐    │
│ Bio          │ │img1│img2│img3│    │
│ Location     │ ├────┼────┼────┤    │
│ Price        │ │img4│img5│img6│    │
│ [我想詢價]   │ └────┴────┴────┘    │
│ + 加入比較   │                      │
│ (sticky)     │                      │
└──────────────┴──────────────────────┘
```

### Acceptance Criteria
- Desktop: two-column layout with sticky left sidebar
- Mobile/tablet: single-column stack (no regression)
- CTA button visible without scrolling on desktop
- Portfolio grid fills available width

---

## Fix 5: Mobile Bottom Nav on Homepage (P1)

### Problem
`MobileNav` (fixed, bottom-0, z-50) doesn't appear on homepage despite being in the DOM.
`CompareFloatingBar` shares the same positioning.

### Solution
1. Check if homepage hero creates a stacking context that traps the nav
2. Increase MobileNav z-index if needed (z-50 → higher, or fix the stacking context)
3. Ensure CompareFloatingBar and MobileNav coexist properly (CompareFloatingBar should sit above MobileNav with bottom offset)
4. Verify MobileNav appears on all pages

### Acceptance Criteria
- MobileNav visible on homepage (mobile viewport)
- MobileNav visible on all other pages (no regression)
- CompareFloatingBar doesn't overlap MobileNav
- Bottom nav icons and labels are tappable

---

## Out of Scope (P2 — Next Sprint)

- Language switcher UI in header
- Region dropdown "all" → translated placeholder
- Footer bottom padding for mobile nav
