# Dev Workflow — MANDATORY

開發流程 SOP，所有 feature 開發必須遵循。不管用哪個 skill 入口（superpowers brainstorm、手動開發、issue-analyze），都必須走完這些 phase。

```
Requirement → BDD Draft → Design/Spec → Plan → Implement (TDD) → Code Review → /simplify → QA Handoff
```

## 與 Superpowers Skills 的整合

Superpowers 的 brainstorming / writing-plans / subagent-driven-development 是**執行工具**，不能取代專案流程。對應關係：

| 專案 Phase | Superpowers Skill | 誰負責確保不跳過 |
|-----------|-------------------|----------------|
| Requirement | brainstorming skill（前半段） | skill 自帶 |
| **BDD Draft** | **無對應 — 必須手動觸發** | orchestrator |
| Design/Spec | brainstorming skill（後半段）→ spec file | skill 自帶 |
| Plan | writing-plans skill | skill 自帶 |
| Implement (TDD) | subagent-driven / executing-plans | skill 自帶 |
| Code Review | skill 內建 spec+quality review | skill 自帶 |
| **/simplify** | **無對應 — 必須手動觸發** | orchestrator |
| **QA Handoff** | **無對應 — 必須手動觸發** | orchestrator |

**粗體 = superpowers 不會自動做的，orchestrator 必須主動觸發。**

## Phase 1: Requirements Analysis

1. 讀需求文件（Obsidian spec、GitHub issue、用戶描述）
2. 確認 user persona（消費者？刺青師？管理員？）
3. 定義 acceptance criteria（什麼情況算「完成」）
4. 列出影響範圍（哪些 endpoint、哪些頁面、哪些 model）

如果用 superpowers brainstorming：這個 phase 在 brainstorm 的問答階段完成。

## Phase 2: BDD Feature File（在 spec 之後、plan 之前）

### Golden Rule：BDD 從需求寫，不看 code

**BDD 是需求文件，不是 code 的描述。**

- 從 user story / acceptance criteria / spec 出發
- 用使用者的語言描述行為
- 絕對不能先看 codebase 再寫 BDD（這會變成 code 的鏡像）
- 由 product agent 或 orchestrator 寫初版

### 時機

- **用 superpowers 流程時**：brainstorm 產出 spec 後、writing-plans 之前
- **手動開發時**：需求確認後、寫 code 之前
- 可與實作並行完善（發現新場景時補充）
- PR 提交前 BDD 必須是最終版

### 格式規範

| 項目 | 規範 |
|------|------|
| 路徑 | `docs/bdd/{feature-name}.feature`（kebab-case） |
| 語言 | Gherkin + 繁體中文 |
| 一個 feature 一個檔案 | 對應一個 PR |
| 範例 | `docs/bdd/shipping-flow.feature` |

### 結構

```gherkin
Feature: {功能名稱}
  {1-3 句描述這個功能解決什麼問題}

  Background:
    Given {前置條件}

  Scenario: {場景名稱}
    Given {前置狀態}
    When {使用者動作}
    Then {預期結果}
    And {附加驗證}
```

### 必須涵蓋的面向

- **Happy path**：正常流程
- **Error path**：錯誤處理（權限不足、狀態錯誤、資料缺失）
- **Edge case**：邊界條件（併發、空值、極端數量）
- **UI 行為**：使用者看到什麼、能操作什麼（如適用）

## Phase 3: Design / Spec（如果用 superpowers）

如果用 superpowers brainstorming skill：
- 產出 `docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md`
- Spec review loop 通過後才進入 Phase 4

如果手動開發：
- 簡單功能可跳過正式 spec，但 BDD 仍然必做
- 複雜功能建議寫 spec

## Phase 4: Plan + Implement（TDD）

### Plan

如果用 superpowers writing-plans skill：
- 產出 `docs/superpowers/plans/YYYY-MM-DD-{feature}.md`
- **Plan 的 Task 0 必須包含 BDD file**（如果 Phase 2 還沒寫）
- 用 subagent-driven-development 或 executing-plans 執行

### TDD

TDD 寫 unit test + integration test，BDD 寫 E2E acceptance test。兩者角色不同，不重疊。

| 層級 | 工具 | 負責 |
|------|------|------|
| Unit test | Vitest | TDD 開發者寫 |
| Integration test | Vitest + supertest | TDD 開發者寫 |
| E2E acceptance | Playwright | QA agent 從 BDD 翻譯 |

### 覆蓋率要求

- 最低 80%
- 正向 + 負向場景
- 跨 endpoint 流程用 integration test

## Phase 5: Code Review + /simplify

1. 跑 **code-reviewer** agent（MANDATORY）
2. 跑 **typescript-reviewer** agent（MANDATORY — 本專案全 TypeScript）
3. 改了 Supabase schema / migration / 複雜 query → 跑 **database-reviewer** agent
4. 改了 LINE auth / API endpoint / user input → 跑 `/everything-claude-code:security-review`
5. 修復 CRITICAL / HIGH issues
6. 跑 `/simplify` — 檢查 code reuse、quality、efficiency
7. 在同一 branch 修復，不開新 PR

**注意**：superpowers 的 spec+quality review 不能取代 `/simplify`。兩者都要跑。

## Phase 6: QA Handoff

開發完成後，交付以下給 QA agent：

### 交付清單

| 項目 | 說明 |
|------|------|
| BDD file | `docs/bdd/{feature-name}.feature` 最終版 |
| Branch | feature branch name |
| Seed data readiness | 測試資料準備狀態 |
| Known limitations | 已知限制或待辦 |

### Seed Data Protocol

| 優先級 | 方式 | 適用場景 |
|--------|------|---------|
| Tier 1 | E2E test 自建資料（`beforeAll` via API） | 最佳隔離，推薦 |
| Tier 2 | QA API endpoint（`/admin/qa/*`） | 需要 admin 權限的狀態操控 |
| Tier 3 | Seed script（`seed_staging.py`） | 基礎資料，部署後跑 |

### 核心規則

**QA 不能因為沒資料就不測。缺資料 = blocking，RD 必須先補。**

- QA 發現缺資料 → 開 P0 ticket 給 RD
- RD 優先用 Tier 1（test 自建）解決
- 無法自建 → 提供 QA API endpoint 或 seed script
- 絕不允許「staging 沒資料所以跳過這個 scenario」

## Checklist（每次開發前快速對照）

開始前：
- [ ] BDD feature file 已寫（`docs/bdd/{name}.feature`）
- [ ] Spec 已寫（複雜功能）或需求已確認（簡單功能）

完成前：
- [ ] Unit + integration tests 通過（80%+ coverage）
- [ ] Code review 通過（CRITICAL/HIGH = 0）
- [ ] TypeScript review 通過（typescript-reviewer agent）
- [ ] `/simplify` 已跑，issues 已修
- [ ] BDD file 已更新為最終版
- [ ] QA Handoff 交付清單齊全
