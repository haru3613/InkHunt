# InkHunt — 找到你的刺青師

台灣第一個刺青師垂直媒合平台。按風格篩選、瀏覽作品集、價格透明、一鍵詢價。

## Features

- **風格篩選** — 18 種刺青風格標籤（寫實、幾何、日式、極簡線條...）
- **地區篩選** — 台灣各縣市
- **作品集展示** — 大圖 Gallery + Lightbox + 恢復照對比
- **一鍵詢價** — 填寫需求、選部位、設預算，LINE 登入送出
- **SEO 優先** — 每位刺青師都有獨立 SEO 頁面 + JSON-LD 結構化資料
- **Mobile-first** — 手機優先設計，底部 Tab 導航

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | LINE Login (LIFF) |
| Storage | Supabase Storage |
| Deploy | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env vars
cp .env.local.example .env.local
# Fill in your Supabase and LINE credentials

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/                    # Next.js App Router
    (public)/             # Consumer pages (no auth)
      artists/            # Artist list + profile
      styles/             # Style category pages (SSG)
    (artist)/             # Artist dashboard (LINE auth)
    (admin)/              # Admin panel
    api/                  # API Route Handlers
  components/
    artists/              # ArtistCard, Profile, Portfolio, Filters
    inquiry/              # InquiryForm
    layout/               # Header, Footer, MobileNav
    ui/                   # shadcn/ui components
  lib/
    supabase/             # Client + queries
    validations/          # Zod schemas
    seo.ts                # JSON-LD helpers
    utils.ts              # Shared utilities
supabase/
  migrations/             # SQL schema + RLS policies
  seed.sql                # 18 tattoo style tags
```

## Scripts

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run test:unit:coverage  # Unit tests with coverage
```

## Database

8 tables: `artists`, `styles`, `artist_styles`, `portfolio_items`, `inquiries`, `quotes`, `reviews`, `favorites`

Schema: `supabase/migrations/001_initial_schema.sql`
RLS: `supabase/migrations/002_rls_policies.sql`
Seed: `supabase/seed.sql` (18 tattoo styles)

## Roadmap

- [x] Project setup + architecture
- [x] Artist list page with style/city filters
- [x] Artist profile page with portfolio gallery
- [x] Inquiry form with Zod validation
- [x] 18 style category pages (SSG)
- [x] SEO (sitemap, robots, JSON-LD, OG tags)
- [x] Test infrastructure (Vitest + Playwright)
- [ ] LINE Login integration
- [ ] Artist dashboard (inquiry management)
- [ ] Artist portfolio management
- [ ] LINE Messaging notifications
- [ ] Admin panel
- [ ] Connect to Supabase (replace mock data)
- [ ] Deploy to Vercel

## License

Private
