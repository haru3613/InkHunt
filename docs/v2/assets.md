# V2 visual references and assets

Generated with the built-in Image Gen tool on 2026-10-01. No external image API or key was used.

| File | Purpose | Publication treatment |
|---|---|---|
| concepts/discovery.png | Desktop primary screen reference | Design documentation only; pictured creators are illustrative |
| concepts/workflows.png | Guided inquiry and artist conversation visual reference | Design documentation only; sample messages/counts are illustrative |
| ../../public/images/v2/botanical-editorial.jpg | Editorial landing photograph | Visible caption identifies AI-generated inspiration; never used as an artist portfolio |

## Generation prompts

Discovery: High-fidelity 1536×1024 desktop UI for InkHunt v2, a Traditional Chinese Taiwan tattoo discovery and inquiry marketplace. Light editorial directory: paper #F7F6F2, ink #20241F, moss #53614A, thin separators, 8px controls. Header InkHunt, 探索作品, 找刺青師, 我的收藏, 刺青師入駐, 登入. Hero 找到想留在身上的，也找到懂你的。 Supporting 從喜歡的作品開始，慢慢找到適合你的刺青師。 Actions 探索作品 and 還沒想法？幫我找方向. Botanical blackwork arm photograph. Below, 從一點喜歡開始, subject tabs and region/style controls, four photo-first work tiles with creator/location/save affordance. No fake metrics, testimonials, eyebrow labels, decorative pills or gradients. Native code UI, separable imagery, mobile-compatible anatomy.

Workflows: Two coordinated readable screens, same paper/white/moss visual system. Guided inquiry: 把你的想法，說給刺青師聽。 Three steps 想法/細節/確認, labelled placement/size/budget fields, back/next controls, clear inquiry-not-booking copy. Artist workspace: InkHunt 工作室, 總覽/詢價/作品/個人資料, compact inbox and selected conversation with reference image, quote card and message composer. Sample data only; all final implementation data comes from the database.

Hero photograph: Photorealistic editorial horizontal 1536×1024 close-up of an adult upper arm with delicate black botanical linework, flowering stems and leaves, ivory linen sleeveless clothing. Face outside frame. Arm in right two-thirds; soft ivory linen/neutral studio background on left. Soft indirect daylight, quiet art-book mood, natural skin texture, desaturated olive background, authentic depth. No text, logos or watermark. Decorative inspiration, not a real artist portfolio.

## Intentional implementation differences

- Added 我的詢價 navigation so consumers can return to their conversations.
- Added permanent-free/no-commission copy per the user's clarified vision.
- Artwork tiles use actual approved-artist database content, not the concept's fabricated people or work.
- Cold-start and service-error surfaces replace the populated grid when appropriate.
- Local acceptance seed creators have explicit 【測試】 names and image captions; no seeded records may be imported into production.
- Appointment proposal/confirmation was added after the user clarified booking as a core goal; it follows the same form/workspace component family.
