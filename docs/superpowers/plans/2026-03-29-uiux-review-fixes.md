# UI/UX Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 production UI/UX issues (2 P0 + 3 P1) found during the ink-hunt.com review.

**Architecture:** Bug fixes and UI improvements to existing Next.js 15 + next-intl + Supabase stack. No new dependencies. Each task is independent and can be committed separately.

**Tech Stack:** Next.js 15 App Router, next-intl, Supabase, Tailwind CSS, TypeScript

---

## File Map

| Task | Files to modify | Purpose |
|------|----------------|---------|
| 1 | `messages/en.json`, `messages/zh-TW.json`, `src/components/artists/ArtistFilters.tsx` | i18n city name translations |
| 2 | `src/lib/supabase/queries/styles.ts` | Fix artist count query |
| 3 | `src/components/artists/ArtistCard.tsx` | Add portfolio thumbnails |
| 4 | `src/app/[locale]/(public)/artists/[slug]/page.tsx` | Two-column profile layout |
| 5 | `src/app/[locale]/(public)/page.tsx`, `src/components/artists/CompareFloatingBar.tsx` | Fix mobile nav z-index |

---

### Task 1: Fix i18n — Translate City Names in Artist Filters

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh-TW.json`
- Modify: `src/components/artists/ArtistFilters.tsx`

- [ ] **Step 1: Add city translation keys to `messages/zh-TW.json`**

In the `"artists"` section, after `"priceFrom"`, add:

```json
"cityTaipei": "台北市",
"cityNewTaipei": "新北市",
"cityTaoyuan": "桃園市",
"cityTaichung": "台中市",
"cityKaohsiung": "高雄市",
"cityTainan": "台南市",
"cityPingtung": "屏東縣"
```

- [ ] **Step 2: Add English city translations to `messages/en.json`**

In the `"artists"` section, after `"priceFrom"`, add:

```json
"cityTaipei": "Taipei",
"cityNewTaipei": "New Taipei",
"cityTaoyuan": "Taoyuan",
"cityTaichung": "Taichung",
"cityKaohsiung": "Kaohsiung",
"cityTainan": "Tainan",
"cityPingtung": "Pingtung"
```

- [ ] **Step 3: Replace hardcoded `CITIES` array in `ArtistFilters.tsx`**

Replace lines 21-29:

```tsx
// Old: hardcoded Chinese city names
const CITIES = [
  '台北市',
  ...
] as const
```

With a `CITY_KEYS` array that maps to translation keys, and keep the DB values for the URL param:

```tsx
const CITY_KEYS = [
  { key: 'cityTaipei', value: '台北市' },
  { key: 'cityNewTaipei', value: '新北市' },
  { key: 'cityTaoyuan', value: '桃園市' },
  { key: 'cityTaichung', value: '台中市' },
  { key: 'cityKaohsiung', value: '高雄市' },
  { key: 'cityTainan', value: '台南市' },
  { key: 'cityPingtung', value: '屏東縣' },
] as const
```

Then update the Select rendering (lines 79-83) from:

```tsx
{CITIES.map((city) => (
  <SelectItem key={city} value={city}>
    {city}
  </SelectItem>
))}
```

To:

```tsx
{CITY_KEYS.map(({ key, value }) => (
  <SelectItem key={value} value={value}>
    {t(key)}
  </SelectItem>
))}
```

- [ ] **Step 4: Verify i18n works locally**

Run: `npm run dev`

Test in browser:
1. Visit `http://localhost:3000/en/artists` — city dropdown should show English names
2. Visit `http://localhost:3000/zh-TW/artists` — city dropdown should show Chinese names
3. Select a city and confirm the URL param still uses the Chinese DB value (e.g., `?city=台北市`)

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/zh-TW.json src/components/artists/ArtistFilters.tsx
git commit -m "fix: translate city names in artist filters for i18n"
```

---

### Task 2: Fix Style Category Artist Counts

**Files:**
- Modify: `src/lib/supabase/queries/styles.ts`

- [ ] **Step 1: Investigate the data**

Run this curl to check if `artist_styles` has any rows:

```bash
# In the browser dev tools console or via Supabase dashboard:
# Check if the test artist "Harvey" has any style associations
```

Or add a temporary `console.log` in `getAllArtistCounts()` to see what `artistStyles` returns.

The query at line 76-79 uses:
```typescript
.select('style_id, artists!inner(status)')
.eq('artists.status', 'active')
```

This inner join should work, but if the test artist has no `artist_styles` rows, the count will correctly be 0.

- [ ] **Step 2: Fix the query to handle the response shape correctly**

The current query joins through `artist_styles → artists` but Supabase returns the nested `artists` field as an object. The iteration at line 84 works because `row.style_id` is a top-level field. The issue is likely that there are simply no `artist_styles` rows.

However, to make the query more robust, replace the `getAllArtistCounts` function (lines 71-100) with:

```typescript
export async function getAllArtistCounts(): Promise<Map<string, number>> {
  const supabase = safeAdminClient()
  if (!supabase) return new Map()
  const counts = new Map<string, number>()

  // Get all styles first
  const { data: styles } = await supabase
    .from('styles')
    .select('id, slug')

  if (!styles) return counts

  // Get all artist_style links for active artists
  const { data: artistStyles, error: asError } = await supabase
    .from('artist_styles')
    .select('style_id, artists!inner(status)')
    .eq('artists.status', 'active')

  if (asError || !artistStyles) {
    // If query fails, return all zeros
    for (const style of styles) {
      counts.set(style.slug, 0)
    }
    return counts
  }

  // Count by style_id
  const styleIdCounts = new Map<number, number>()
  for (const row of artistStyles) {
    styleIdCounts.set(row.style_id, (styleIdCounts.get(row.style_id) ?? 0) + 1)
  }

  // Map style IDs to slugs
  for (const style of styles) {
    counts.set(style.slug, styleIdCounts.get(style.id) ?? 0)
  }

  return counts
}
```

This is essentially the same logic but with better error handling. The real fix is ensuring `artist_styles` data exists.

- [ ] **Step 3: If no artist_styles data exists, the homepage will correctly show 0**

This is a data issue, not a code bug. The test artist "Harvey" needs to have styles associated via the `artist_styles` table. This can be done through:
- The artist dashboard (if the feature exists)
- A database seed or manual insert

If the artist dashboard has a style selection feature, use it. Otherwise, note this as a data gap for the user.

- [ ] **Step 4: Verify locally**

Run: `npm run dev`
Visit `http://localhost:3000/` — check if style cards show non-zero counts (only if artist_styles data exists).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/queries/styles.ts
git commit -m "fix: improve getAllArtistCounts query robustness"
```

---

### Task 3: Add Portfolio Thumbnails to Artist Cards

**Files:**
- Modify: `src/components/artists/ArtistCard.tsx`

- [ ] **Step 1: Add thumbnail strip to the default `ArtistCard` variant**

In `ArtistCard` (the main export, not `CompactCard`), add a portfolio thumbnail row between the styles badges and the `PriceRange`. Insert after line 68 (after the styles `</div>`) and before line 70 (`<PriceRange ...>`):

```tsx
{artist.portfolio_items.length > 0 && (
  <div className="flex gap-1">
    {artist.portfolio_items.slice(0, 3).map((item) => (
      <div key={item.id} className="relative aspect-square w-1/3 overflow-hidden">
        <Image
          src={item.thumbnail_url ?? item.image_url}
          alt={item.description ?? `${artist.display_name} work`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 120px"
        />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: Add the Image import**

At the top of the file, add:

```tsx
import Image from 'next/image'
```

The existing imports at line 1-10 already have `getTranslations`, `Link`, etc. Add `Image` after the `next/navigation` or `next-intl` imports.

- [ ] **Step 3: Verify locally**

Run: `npm run dev`
Visit `http://localhost:3000/zh-TW/artists` — artist cards should show up to 3 portfolio thumbnails. The images should have sharp edges (0px border-radius) and be square-cropped.

If the test artist has no portfolio items, the thumbnail row should not appear.

- [ ] **Step 4: Commit**

```bash
git add src/components/artists/ArtistCard.tsx
git commit -m "feat: add portfolio thumbnails to artist listing cards"
```

---

### Task 4: Two-Column Desktop Layout for Artist Profile

**Files:**
- Modify: `src/app/[locale]/(public)/artists/[slug]/page.tsx`

- [ ] **Step 1: Restructure the profile page layout**

Replace the content inside `<>...</>` (lines 73-104) with a two-column layout:

```tsx
<>
  <JsonLd data={jsonLd} />
  <div className="mx-auto max-w-6xl px-4 py-6">
    <BackButton />

    <div className="mt-4 lg:flex lg:gap-8">
      {/* Left column — artist info (sticky on desktop) */}
      <div className="lg:w-[340px] lg:shrink-0">
        <div className="lg:sticky lg:top-20">
          <ArtistProfile artist={artist} />
          <div className="mt-3">
            <ArtistCompareAction
              artist={{
                id: artist.id,
                display_name: artist.display_name,
                slug: artist.slug,
                avatar_url: artist.avatar_url ?? null,
              }}
            />
          </div>
        </div>
      </div>

      {/* Right column — portfolio */}
      <div className="mt-6 min-w-0 flex-1 lg:mt-0">
        <h2 className="font-display mb-4 text-lg font-bold text-foreground">
          {t("portfolio")}
        </h2>
        <PortfolioSection items={artist.portfolio_items} />
      </div>
    </div>
  </div>

  {/* Mobile sticky CTA */}
  <MobileCTA artistId={artist.id} artistName={artist.display_name} />
</>
```

Key changes:
- Container: `max-w-4xl` → `max-w-6xl`
- Added `lg:flex lg:gap-8` for two-column layout
- Left column: `lg:w-[340px] lg:shrink-0` with `lg:sticky lg:top-20`
- Right column: `min-w-0 flex-1`
- Portfolio section moved into right column
- Mobile: stacks naturally (no `lg:` classes active)

- [ ] **Step 2: Verify locally**

Run: `npm run dev`

Test at multiple viewports:
1. Desktop (1280px+): Profile info on left, portfolio on right. Info card sticks when scrolling.
2. Tablet (768px): Single column (no `lg:` breakpoint)
3. Mobile (375px): Single column, CTA at bottom

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(public)/artists/[slug]/page.tsx
git commit -m "feat: two-column desktop layout for artist profile"
```

---

### Task 5: Fix Mobile Bottom Nav Visibility on Homepage

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`
- Modify: `src/components/artists/CompareFloatingBar.tsx`

- [ ] **Step 1: Diagnose the hero stacking context**

The homepage hero section (line 37 in `page.tsx`) uses:
```tsx
<section className="relative flex min-h-svh items-end">
```

The `relative` positioning on a `min-h-svh` element, combined with the `z-10` on the hero content container (line 50), creates a stacking context. The hero section's `min-h-svh` means it fills the entire viewport, and its `relative` positioning means children with `z-10` paint above siblings.

The `MobileNav` has `z-50` which should be higher, but the hero's `Image` with `fill` (which becomes `position: absolute`) and the gradient overlay may be creating visual overlap.

The actual issue: the `MobileNav` IS rendering, but the hero section `min-h-svh` pushes it below the visible fold. When the page first loads, the viewport shows only the hero. The nav is at the bottom of the DOM, but the hero takes up 100vh, so the nav appears only after scrolling past the hero — but it's `fixed`, so it should show. Let me check if it's a `backdrop-blur` or `bg-background` transparency issue.

The `MobileNav` has `bg-background` which is `#0A0A0A`. This should be opaque. The likely cause is that `CompareFloatingBar` with `z-50` and `bottom-0` is covering it when compare is active, but when compare has 0 artists, it returns `null`.

Check the actual issue: the hero `Image` has `fill` + `className="object-cover"`. With `fill`, Next.js Image becomes `position: absolute; inset: 0`. The parent `section` has `relative`. This means the image fills the section. The gradient overlay also has `absolute inset-0`. None of this should affect the fixed nav.

The most likely cause: the hero image or its gradient overlay has a very high paint order that somehow occludes the fixed nav on some browsers. Fix by ensuring the hero section does NOT create an isolation context:

- [ ] **Step 2: Ensure the hero section doesn't trap the stacking context**

In `src/app/[locale]/(public)/page.tsx`, the hero section at line 37 has `relative`. Add `isolate` to explicitly isolate its stacking context, preventing it from interfering with sibling fixed elements. Actually, the opposite — we need to make sure it does NOT have `isolation: isolate` already.

The fix: add `z-0` to the hero section to ensure it paints below `z-50`:

Change line 37 from:
```tsx
<section className="relative flex min-h-svh items-end">
```

To:
```tsx
<section className="relative z-0 flex min-h-svh items-end">
```

This explicitly sets the hero's z-index to 0, ensuring the `z-50` MobileNav always paints above it.

- [ ] **Step 3: Fix CompareFloatingBar to sit above MobileNav**

The `CompareFloatingBar` also uses `bottom-0 z-50`, which conflicts with `MobileNav`'s `bottom-0 z-50`. When the compare bar appears, it covers the nav.

In `src/components/artists/CompareFloatingBar.tsx`, change line 27 from:

```tsx
className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-xl"
```

To (add `bottom-14` to sit above the 56px nav, and use `lg:bottom-0` for desktop where there's no nav):

```tsx
className="fixed inset-x-0 bottom-14 z-50 border-t border-border bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-xl lg:bottom-0"
```

- [ ] **Step 4: Verify locally**

Run: `npm run dev`

Test on mobile viewport (375x812):
1. Homepage: bottom nav should be visible immediately, even while viewing the hero
2. Artists page: bottom nav visible
3. Artist profile: bottom nav visible, CTA sits above nav
4. Add an artist to compare: compare bar sits above nav, both are tappable

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/(public)/page.tsx src/components/artists/CompareFloatingBar.tsx
git commit -m "fix: mobile bottom nav visibility on homepage + compare bar overlap"
```

---

## Post-Implementation Checklist

After all tasks are complete:

- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Test all pages in both `/en` and `/zh-TW` locales
- [ ] Test mobile (375px), tablet (768px), and desktop (1280px) viewports
- [ ] Verify no console errors
- [ ] Run existing tests: `npm test`
