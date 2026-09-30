# InkHunt v2 — 免費找到彼此

User direction (2026-10-01): Google-discoverable tattoo marketplace. Artists register, consumers discover work and arrange appointments. Both sides free; no commission, subscriptions or paid placement. This supersedes legacy Pro/Premium plans.

## MVP journeys

- Guest: explore approved artists' actual work by subject, style and city; understand pricing; view public artist profile and portfolio; start guided inquiry.
- Undecided consumer: guided discovery explains taste, location and budget without claiming AI matching; results link to real approved artists.
- Consumer: LINE login preserves the inquiry draft, explicitly send inquiry, receive messages/quote, accept or decline, coordinate appointment time in conversation, close inquiry, save artists and return later.
- Artist: value page → LINE sign-in → application/profile/portfolio → pending review → approved public listing; edit portfolio and prices, receive inquiries, chat, send quote and coordinate appointment.
- Admin: approve/reject/suspend applications; suspension removes public discoverability and new inquiry eligibility.
- Empty/error cases: no supply, no matches, logged out, pending/rejected, upload/network failure, duplicate submission, expired session, forbidden record, mobile keyboard and navigation.

## Product boundaries

No payment, subscriptions, commission, paid exposure, automated diagnosis, AI promises, fabricated artists/reviews/metrics. Accepting a quote is a booking intent. Artist then proposes an appointment date/time and location; consumer explicitly confirms the appointment. Either participant can cancel. Payment/deposit details stay between participants. No promise that Google will rank or users will register. Editorial generated imagery is labeled inspiration and never represented as an artist's work.

## Visual system

Concepts: `concepts/discovery.png`, `concepts/workflows.png` generated with built-in imagegen. User requested autonomous implementation; these are agent-selected working references, not user-approved mocks.
Paper #F7F6F2, white cards/popovers, ink #20241F, moss primary #53614A, gray #62675F, separator #DEDFD7. Serif wordmark, readable Chinese sans content, 8px controls, 44px minimum primary touch targets. Max width 1408px with generous gutters. Open artwork grid; workspace panels only where useful. Header: explore, artists, saved, inquiries, artist entry and account. Mobile bottom navigation with safe-area space. No dark-gallery restriction for v2.

Hero copy: 找到想留在身上的，也找到懂你的。 Supporting: 從喜歡的作品開始，慢慢找到適合你的刺青師。 Actions: 探索作品 / 還沒想法？幫我找方向. Discovery heading: 從一點喜歡開始. Portfolio data always comes from the database; no mock identity on public production pages.

## Delivery evidence

Required: typecheck, lint, unit suite, production build, desktop/mobile browser review, real local DB tests for inquiry → message → quote → response and onboarding/admin visibility. Local testing cannot verify live LINE OAuth, LINE push delivery, Google indexing or production database migration; report those separately and prepare rollout steps.
