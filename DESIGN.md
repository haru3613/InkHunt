# Design System — InkHunt

## Product Context
- **What this is:** Taiwan's first vertical tattoo artist marketplace
- **Who it's for:** 18-35 year old Taiwanese consumers looking for tattoo artists
- **Space/industry:** Tattoo / creative services marketplace
- **Project type:** Consumer-facing web app (mobile-first)

## Aesthetic Direction
- **Direction:** Editorial Dark Gallery
- **Decoration level:** Intentional — subtle grain/texture on hover, image-driven decoration
- **Mood:** An art gallery at night. Confident, quiet, bold. The tattoo art speaks; the UI steps back.
- **Reference sites:** Monolith Studio, Awwwards tattoo collection, Behance dark portfolios

## Typography
- **Display/Hero:** Space Grotesk 700 — geometric grotesk with personality, supports Latin+CJK mixed layouts. Not the typical serif or condensed everyone uses.
- **CJK (Chinese):** Noto Sans TC 700 — pairs with Space Grotesk's geometric DNA
- **Body:** DM Sans 400/500 — softer geometric sans for readability, same family feel but more approachable
- **UI/Labels:** Space Grotesk 500, uppercase, letter-spacing 0.08em — gives a refined label feel
- **Data/Tables:** DM Sans (tabular-nums)
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN — `Space+Grotesk:wght@400;500;600;700` + `DM+Sans:wght@400;500;700` + `Noto+Sans+TC:wght@400;500;700`
- **Scale:**
  - Hero: clamp(48px, 8vw, 96px) — dramatic, poster-like
  - H1: clamp(32px, 4vw, 48px)
  - H2: 24px
  - H3: 20px
  - Body: 16px (desktop), 15px (mobile)
  - Small: 14px
  - Caption: 13px
  - Label: 12px uppercase

## Color
- **Approach:** Restrained dark — one warm accent on near-black
- **Background:** `#0A0A0A` — near-black, warmer than pure black
- **Surface:** `#141414` — cards, modals, elevated elements
- **Surface Hover:** `#1C1C1C`
- **Border:** `#2A2A2A` — subtle separation
- **Text Primary:** `#F5F0EB` — warm off-white, paper-like (NOT pure white)
- **Text Secondary:** `#8A8A8A`
- **Text Muted:** `#555555`
- **Accent:** `#C8A97E` — brass/gold, like the metal of a tattoo machine
- **Accent Hover:** `#E8D5B5` — bright gold
- **Accent Dim:** `rgba(200,169,126,0.15)` — for tag backgrounds, subtle highlights
- **Semantic:** success `#4ADE80`, warning `#FBBF24`, error `#F87171`, info `#60A5FA`
- **Dark mode:** This IS the dark mode. No light mode for MVP (the art demands darkness).

## Spacing
- **Base unit:** 4px
- **Density:** Spacious — generous whitespace lets the art breathe
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(100)

## Layout
- **Approach:** Creative-editorial — hero as poster, content sections with intentional asymmetry
- **Grid:** Full-bleed hero, 12-col content grid, 4px gap for portfolio grids
- **Max content width:** 1200px (main), 480px (forms), 900px (reading)
- **Border radius:**
  - None (0px): style category cards, portfolio images — sharp edges = raw energy
  - sm (4px): buttons, tags, inputs
  - md (8px): form containers
  - lg (12px): artist cards, modals
  - full: avatars only

## Motion
- **Approach:** Intentional — purposeful transitions that enhance, not distract
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(300ms) long(500ms)
- **Patterns:**
  - Image hover: `scale(1.05)` with `500ms ease` — subtle zoom
  - Card hover: `translateY(-4px)` + border-color change — lift effect
  - Page transitions: fade-in content sections
  - Filter brightness on style card images: `brightness(0.5)` → `brightness(0.7)` on hover
  - No parallax, no scroll-hijacking (mobile-first, performance-first)

## Key Design Principles

1. **The art is the interface.** Tattoo photos should dominate. UI chrome stays minimal and dark.
2. **No emoji. No decorative icons.** Style categories use real tattoo photos as backgrounds, not emoji.
3. **Warm, not cold.** Off-white text (#F5F0EB), brass accent (#C8A97E) — craft workshop, not tech lab.
4. **Sharp where art lives, rounded where humans interact.** Portfolio grids: 0px radius. Buttons/cards: 4-12px radius.
5. **Uppercase labels, mixed-case content.** Labels/nav in Space Grotesk uppercase. Body text in DM Sans sentence case.

## CSS Custom Properties

```css
:root {
  --bg: #0A0A0A;
  --surface: #141414;
  --surface-hover: #1C1C1C;
  --border: #2A2A2A;
  --text-primary: #F5F0EB;
  --text-secondary: #8A8A8A;
  --text-muted: #555555;
  --accent: #C8A97E;
  --accent-hover: #E8D5B5;
  --accent-dim: rgba(200,169,126,0.15);
  --success: #4ADE80;
  --warning: #FBBF24;
  --error: #F87171;
  --info: #60A5FA;
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  --font-display: 'Space Grotesk', 'Noto Sans TC', sans-serif;
  --font-body: 'DM Sans', 'Noto Sans TC', sans-serif;
  --font-cjk: 'Noto Sans TC', sans-serif;
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-27 | Initial design system created | Inspired by Awwwards tattoo sites (Monolith Studio). Dark editorial gallery aesthetic for tattoo art marketplace. |
| 2026-03-27 | Brass accent (#C8A97E) over red/purple | Most tattoo sites use red or purple; brass evokes craft/metalwork quality, more mature. |
| 2026-03-27 | Warm off-white (#F5F0EB) text | Pure white is harsh on dark backgrounds. Warm white gives paper/parchment feel. |
| 2026-03-27 | Space Grotesk for display | Geometric grotesk is modern without being generic. Stands out from the condensed/serif fonts most tattoo sites use. |
| 2026-03-27 | No light mode for MVP | The art demands darkness. Tattoo photography pops on dark backgrounds. |
| 2026-03-27 | Photo-backed style categories, no emoji | Emoji looked cheap and AI-generated. Real tattoo photos as category thumbnails. |
| 2026-03-27 | Route-level i18n (next-intl) | zh-TW + en, URL prefix routing. UI text translated, artist content stays original language. |
