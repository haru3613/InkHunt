# InkHunt v2

免費的台灣刺青師媒合網站。讓使用者從作品找到喜歡的創作者，免費詢價、溝通並確認預約。刺青師免費入駐，平台不收取抽成、訂閱費或曝光費。

## MVP

- 作品探索：題材、風格、地區、分頁、收藏與空狀態。
- 初次刺青引導：從喜歡的題材與地區開始找方向。
- 刺青師頁：作品、參考價格、個人資訊與結構化 SEO。
- 三步驟詢價：描述、私人參考圖、部位、大小、預算，LINE 登入後保留草稿。
- 私人對話與報價：持久化訊息、即時更新、接受／婉拒與狀態鎖定。
- 預約安排：刺青師提出台灣時間與地點，使用者確認，雙方可取消。
- 刺青師入駐：LINE 身分、審核、私人檔案、作品上傳／編輯／刪除、上傳失敗重試。
- 管理員：核准、退回、停權；未核准內容不公開。

預約不包含線上付款、訂金代收或公開即時空檔日曆。付款與取消約定由雙方直接確認。

## Local acceptance

Node 22.14+ (22.x) and npm 11.6.2. A working Docker installation is needed for the isolated Supabase stack.

```bash
npx --yes npm@11.6.2 ci
./scripts/v2-supabase-up
./scripts/v2-supabase-seed
./scripts/v2-dev
```

Open http://localhost:3200/zh-TW. The development-only **Dev Login** menu provides consumer, artist and admin test accounts. The v2 stack uses ports 5632x and its own volume. Never run the local seed against production.

```bash
npm run test:v2:acceptance
npx eslint src/
npx tsc --noEmit
npm run test:unit -- --maxWorkers=2
# Stop dev before building into the same .next directory.
NODE_OPTIONS=--max-old-space-size=2048 npm run build -- --webpack
```

## Delivery documents

- [Product scope](docs/v2/product.md)
- [Local harness](docs/v2/local-verification.md)
- [Verification receipt](docs/v2/verification.md)
- [Production rollout](docs/v2/launch.md)
- [Current production audit and pending decisions](docs/v2/production-readiness.md)
- [Design system](DESIGN.md)
- [Visual references and asset provenance](docs/v2/assets.md)

The local MVP is verified separately from deployment. Production LINE OAuth/push, cloud migrations/storage and the deployed domain must be checked before public launch. No real user notifications are sent by the isolated local test harness.

## Stack

Next.js 16.2.1, React 19, TypeScript, next-intl, Tailwind CSS, Base UI, Supabase Postgres/Auth/Storage/Realtime, LINE Login/Messaging. Server-validated identity comes from `app_metadata`. Private media is participant-scoped; lifecycle mutations use database transactions.

Private repository.
