# InkHunt — 台灣刺青師媒合平台

## 專案概述

台灣第一個刺青師垂直媒合平台。消費者可以按風格/地區篩選刺青師、瀏覽作品集、一鍵詢價；刺青師可以展示作品、接收詢價、回覆報價。

- **階段**: MVP 開發中
- **產品規劃**: `~/.claude/plans/gleaming-stargazing-marble.md`
- **Obsidian 筆記**: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Side Projects/InkHunt/`

## 技術棧

| 層次 | 選擇 |
|------|------|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| Backend | Next.js Route Handlers (API Routes) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | LINE Login (LIFF SDK) |
| Storage | Supabase Storage (作品集圖片) |
| Deploy | Vercel |
| DNS | Cloudflare |

## 專案結構

```
src/
  app/                    # Next.js App Router
    (public)/             # 消費者頁面 (不需登入)
      page.tsx            # 首頁
      artists/
        page.tsx          # 刺青師列表
        [slug]/
          page.tsx        # 刺青師 Profile
    (artist)/             # 刺青師後台 (需 LINE 登入)
      artist/
        page.tsx          # 入口/登入
        dashboard/
          page.tsx        # 詢價管理
        portfolio/
          page.tsx        # 作品集管理
        profile/
          page.tsx        # 個人資料編輯
    (admin)/              # 管理後台
      admin/
        page.tsx
    api/                  # API Route Handlers
      artists/
      inquiries/
      quotes/
      auth/
    layout.tsx
  components/             # 共用組件
    ui/                   # shadcn/ui 組件
    artists/              # 刺青師相關組件
    inquiry/              # 詢價相關組件
    layout/               # Layout 組件 (Header, Footer, Nav)
  lib/                    # 工具函數
    supabase/             # Supabase client + queries
    line/                 # LINE Login + Messaging API
    utils.ts
  types/                  # TypeScript 型別定義
    database.ts           # DB schema 對應型別
    api.ts                # API request/response 型別
supabase/
  migrations/             # SQL migration files
  seed.sql                # 風格標籤等初始資料
```

## 開發規範

### 語言
- 所有 UI 文字使用**繁體中文**
- 程式碼、註解、commit message 使用英文
- 變數/函數命名用英文

### 命名慣例
- Components: PascalCase (`ArtistCard.tsx`)
- Utilities: camelCase (`formatPrice.ts`)
- API Routes: kebab-case (`/api/artists/[slug]/portfolio`)
- DB columns: snake_case (`display_name`, `created_at`)
- CSS classes: Tailwind utility classes, 不寫自訂 CSS

### 關鍵設計決策
- **SEO 優先**: 刺青師 Profile 頁用 SSG (`generateStaticParams`) + ISR
- **Mobile-first**: 所有頁面先做手機版再做桌面版
- **LINE 是唯一 Auth**: 消費者和刺青師都用 LINE Login
- **不做金流**: 台灣刺青多現金/轉帳，MVP 不整合線上付款
- **指定詢價**: MVP 只做消費者指定刺青師詢價，不做廣播式
- **雙語 i18n**: 用 `next-intl` 做路由層 i18n (`/zh-TW/artists` vs `/en/artists`)，UI 文字有翻譯檔，刺青師 profile 內容維持原語言

### Supabase RLS
- 所有表都啟用 RLS
- 刺青師只能讀寫自己的資料
- 消費者只能讀 active 狀態的刺青師
- 管理員可讀寫所有資料

### 環境變數

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LINE Login
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_LIFF_ID=

# LINE Messaging API
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=
LINE_MESSAGING_CHANNEL_SECRET=
```

## Dev Login (Local Testing)

Local 開發和測試時不需要走 LINE OAuth，用 dev-only API 登入：

```bash
# 登入為 admin 用戶
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H 'Content-Type: application/json' \
  -d '{"line_user_id":"U770e3788b27c6cdeb9248b9f7139f171","display_name":"Harvey"}'
```

- **只在 `NODE_ENV=development` 時可用**，production 會回 404
- 建立真正的 Supabase session，所有 `requireAuth()` / `requireAdmin()` 都能正常運作
- Header 上有 "Dev Login" 按鈕（僅 development 顯示）
- `.env.local` 需要設定 `ADMIN_LINE_USER_IDS` 和 `NEXT_PUBLIC_DEV_ADMIN_LINE_USER_ID`

### QA / E2E 測試使用方式

Playwright E2E 測試時，在 test setup 裡先呼叫 `/api/auth/dev-login` 取得 session cookie，再帶著 cookie 測試需要登入的頁面。不需要 mock auth middleware。

## Agent Team

本專案有 5 個專屬 subagent，位於 `.claude/agents/`：

| Agent | 職責 |
|-------|------|
| `inkhunt-pm` | 產品經理 — 需求、user story、驗收標準 |
| `inkhunt-backend` | 後端 — API Routes、Supabase、LINE Auth |
| `inkhunt-frontend` | 前端 — 頁面、組件、響應式、動畫 |
| `inkhunt-growth` | 成長/SEO — meta tags、structured data、爬蟲 |
| `inkhunt-qa` | QA — E2E 測試、API 測試、accessibility |

### ECC Plugin Agents (Everything Claude Code)

| Agent / Skill | 用途 | 觸發時機 |
|-------|------|----------|
| `typescript-reviewer` agent | TS 型別安全、async 正確性 | **每次 code review 必跑** |
| `database-reviewer` agent | Supabase schema、query 優化、RLS | 改了 migration / 複雜 query |
| `/everything-claude-code:security-review` | OWASP Top 10、auth 安全 | 改了 LINE auth / API endpoint / user input |
| `/everything-claude-code:docs` | Context7 查最新文檔 | 用 Next.js / next-intl / Supabase API 不確定時**必查** |
| `/everything-claude-code:build-fix` | 修 TypeScript / Next.js build 錯誤 | build 壞了直接用 |

### 協作流程
1. PM 拆解 user story + 驗收標準
2. Backend + Frontend + Growth 平行實作
3. QA 驗證所有流程

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key rules from DESIGN.md:
- **Dark theme only** — bg #0A0A0A, surface #141414, text #F5F0EB
- **Accent: brass gold** #C8A97E (not red, not purple, not amber)
- **Fonts:** Space Grotesk (display), DM Sans (body), Noto Sans TC (CJK)
- **No emoji in UI** — use real tattoo photos for style categories
- **Sharp edges for art** (0px radius), **rounded for interaction** (4-12px)
- **Image-forward** — photos dominate, UI chrome stays minimal

## DB Schema

7 張表：`artists`, `styles`, `artist_styles`, `portfolio_items`, `inquiries`, `quotes`, `reviews`, `favorites`

詳見 `supabase/migrations/` 和 Obsidian `DB Schema.md`。
