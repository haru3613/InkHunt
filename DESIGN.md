# InkHunt v2 design system

The October 1, 2026 rebuild supersedes the March dark-gallery direction. The user requests an entirely new, usable marketplace: discoverable through Google, free for artists and consumers, no fees or commission.

## Intent

Work comes first. Help people who do not know tattoo-style vocabulary discover a direction and start an informed conversation with a real artist. Show real portfolio data, real pricing and honest empty states. Never invent marketplace supply, reviews, popularity or completed appointments.

## References

- `docs/v2/concepts/discovery.png`: primary discovery composition.
- `docs/v2/concepts/workflows.png`: guided form and workspace visual family.
- `docs/v2/product.md`: scope and behavior.

These are agent-selected concepts under the user's direct implementation authorization.

## Tokens

| Role | Value |
|---|---|
| Background | #F7F6F2, paper |
| Card/popover | #FFFFFF |
| Foreground | #20241F |
| Secondary text | #62675F |
| Primary action | #53614A, moss |
| Action hover | #3E4B36 |
| Primary text | #FFFFFF |
| Muted surface | #ECEEE7 |
| Border | #DEDFD7 |
| Error | #AD3939 |
| Success | #34734B |

Wordmark uses Georgia/Times serif. Content uses the existing Noto Sans TC + DM Sans stack; display uses Space Grotesk + Noto Sans TC. Controls 14–16px; body 16px with generous leading; hero clamp 34–58px. Maximum public content width 1408px, mobile gutters 16px, desktop gutters 56px.

## Components and behavior

- Art tiles: image-first, 4:3 media, 8px corner, title/artist/location outside the media. No generated images impersonating portfolios.
- Save buttons: real persisted artist favorites, visible failure/retry, accessible pressed state.
- Forms: visible labels, 44px minimum primary actions, field errors and retained input. Three inquiry steps: idea, details, review. OAuth restores the draft; never submits it automatically.
- Navigation: desktop header, mobile bottom tabs and safe-area padding, no overlap with fixed inquiry CTA or chat composer.
- Workspaces: white panels on paper, thin dividers, tabular compact rows, visible network error states. Accepted quotes are not completed tattoos.
- Motion: restrained 150–300ms transitions, reduced-motion respected. No scroll hijacking.
- Both sides free. No subscription upsells, commission, paid ranking or fabricated urgency.
- AI-generated editorial hero is clearly labeled inspiration. Production portfolio images must belong to approved artists and have publication permission.
