# Test Workflow — QA Agent SOP

Audience: inkhunt-qa agent。收到 QA Handoff 後的測試流程。

## Step 1: Data Readiness Check（MANDATORY — 第一步必做）

每個 BDD scenario 逐一檢查測試資料是否存在。

### 檢查流程

```
1. 讀 BDD file（docs/bdd/{feature-name}.feature）
2. 列出每個 Scenario 的 Given 前置條件
3. 對照 staging 環境確認資料是否存在
4. 標記每個 scenario: ✅ ready / ❌ missing
```

### 現有 Seed 工具

| 工具 | 路徑/用法 | 說明 |
|------|-----------|------|
| Dev Login API | `POST /api/auth/dev-login` | 建立 dev session（僅 development） |
| Supabase Seed | `supabase/seed.sql` | 風格標籤等初始資料 |

### 缺資料處理

**缺資料 = STOP。不能跳過，不能假裝測過。**

1. 列出缺少的資料和對應的 scenario
2. 開 P0 ticket 給 RD，標明：
   - 哪個 scenario 需要
   - 需要什麼資料 / 什麼狀態
   - 建議用 Tier 1（test 自建）、Tier 2（QA API）還是 Tier 3（seed script）
3. 等 RD 補完後再繼續

## Step 2: BDD → Playwright 翻譯

將 BDD feature file 翻譯為 Playwright E2E test spec。

### Mapping 規則

| BDD 元素 | Playwright 對應 |
|----------|----------------|
| Feature | `describe('Feature: ...')` |
| Background | `beforeAll()` / `beforeEach()` |
| Scenario | `test('Scenario: ...')` |
| Given | setup（API call / navigation） |
| When | action（click / fill / submit） |
| Then | assertion（expect） |
| And | 額外 assertion 或 action |

### 檔案路徑

```
e2e/tests/{area}/{feature-name}.spec.ts
```

例：`e2e/tests/artist/inquiry-chat.spec.ts`

### Template

```typescript
/**
 * E2E tests for: {Feature 名稱}
 * BDD source: docs/bdd/{feature-name}.feature
 *
 * Scenario coverage:
 * | # | Scenario | Status |
 * |---|----------|--------|
 * | 1 | {scenario name} | ✅ |
 * | 2 | {scenario name} | ✅ |
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('Feature: {功能名稱}', () => {
  // Background
  test.beforeAll(async ({ request }) => {
    // Setup: dev-login + seed data via API
  })

  test('Scenario: {場景名稱}', async ({ page }) => {
    // Given
    await page.goto(`${BASE_URL}/path`)

    // When
    await page.locator('button:has-text("操作")').click()

    // Then
    await expect(page.locator('.result')).toBeVisible()
  })

  // Cleanup
  test.afterAll(async ({ request }) => {
    // 清理測試資料，不留垃圾
  })
})
```

### 翻譯原則

- 每個 BDD Scenario 對應一個 `test()`
- Scenario 名稱直接用 BDD 的中文名
- Given/When/Then 用註解標記，方便追溯
- Background 的共用 setup 放 `beforeAll` 或 `beforeEach`

## Step 3: Test Quality（必要檢查）

每個 E2E test 必須滿足：

### 斷言要求

- **API 斷言**：驗證 response status + body
- **UI 斷言**：驗證頁面元素的文字、可見性、狀態
- 禁止只驗「按鈕存在」就算 PASS

### 必測路徑

- **Happy path**：完整成功流程
- **Error path**：至少 1 個錯誤場景（權限、狀態錯誤）
- **Cleanup**：`afterAll` 清理測試資料，不留 staging 垃圾

### 品質標準

```
✅ 好：完整流程 + 多層斷言
   page.goto → action → expect(status) → expect(UI element) → expect(side effect)

❌ 壞：只驗可見性
   expect(button).isVisible()  // 毫無意義
```

## Step 3.5: 使用共用 Helpers（MANDATORY）

所有 E2E test 必須使用 `e2e/helpers/` 下的共用模組，禁止 inline 重寫。

### Auth Helper

```typescript
import { devLogin } from '../../helpers/auth'

// 用 dev-login API 取得 session
const cookies = await devLogin(request, {
  line_user_id: 'U770e3788b27c6cdeb9248b9f7139f171',
  display_name: 'Harvey',
})
```

### 資料清理

```typescript
import { TestDataCleanup } from '../../helpers/cleanup'

const cleanup = new TestDataCleanup()

test.beforeAll(async ({ request }) => {
  // setup
})

test.afterAll(async ({ request }) => {
  await cleanup.cleanAll(request)
})
```

### 禁止事項

- **禁止** inline 定義 auth helper（用 `helpers/auth.ts`）
- **禁止** 在 `beforeAll` 中使用 `page` 或 `context` fixture
- **禁止** `context.close()` 不包 try/catch

## Step 4: Execute & Report

### 執行指令

```bash
# 單一 spec（用 HTML reporter，含截圖 + trace）
npx playwright test e2e/tests/{area}/{feature-name}.spec.ts --project=chromium --reporter=html

# 全部 E2E
npx playwright test e2e/tests/ --reporter=html

# 查看報告（含截圖）
npx playwright show-report
```

### Pass/Fail Criteria

| 結果 | 條件 |
|------|------|
| PASS | 所有 BDD scenario 都有對應 test 且全部通過 |
| PARTIAL | 部分通過，列出失敗原因 |
| BLOCKED | 缺資料無法測試（已開 ticket） |
| FAIL | 測試失敗，附 screenshot + error log |

### 報告格式

```markdown
## QA Report: {Feature Name}

**BDD Source**: `docs/bdd/{feature-name}.feature`
**Test Spec**: `e2e/tests/{area}/{feature-name}.spec.ts`
**環境**: local / staging
**日期**: YYYY-MM-DD

### Scenario Coverage

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | {name} | ✅ PASS | |
| 2 | {name} | ❌ FAIL | {error description} |
| 3 | {name} | 🚫 BLOCKED | 缺資料：{what} |

### Summary
- Total: N scenarios
- Pass: N
- Fail: N
- Blocked: N

### Failures (if any)
- Screenshot: `e2e/screenshots/{name}.png`
- Error: {error message}
- Root cause: {analysis}

### Blocked Items (if any)
- Scenario: {name}
- Missing: {data/state description}
- Ticket: {P0 ticket reference}
```

## Step 5: Payload Verification（表單功能必測）

### 背景

E2E 測試常見漏洞：UI 斷言驗「欄位有顯示」、API 斷言驗「後端拒絕錯誤」，
但**前端組裝 payload → 實際送出**這一層沒人測。
Bug 就藏在這個縫隙（例：組件漏帶欄位、大小寫不匹配）。

### 規則：涉及表單送出的功能，必須有 Full Submit Test

任何前端有表單 + 後端有對應 API 的功能，E2E 必須包含至少一個 **Full Submit Test**：

1. **透過 UI 填完表單**（不是直接打 API）
2. **攔截 API request**（`page.waitForRequest` 或 `page.route`）
3. **驗證 request payload 欄位完整**（不只驗 status，要驗 request body）
4. **驗證 API response 正確**（後端實際收到並處理）

### 範例

```typescript
// ✅ Full Submit Test — 透過 UI 送出，攔截驗證 payload
test('詢價送出 — UI 填表 → 送出 → 驗 payload', async ({ page }) => {
  // Given: 登入 + 進入詢價頁
  // When: 透過 UI 填完所有欄位
  const [request] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/inquiries') && r.method() === 'POST'),
    page.locator('button:has-text("送出")').click()
  ])
  // Then: 驗證 payload 完整
  const body = request.postDataJSON()
  expect(body).toHaveProperty('body_part')
  expect(body).toHaveProperty('size')
  expect(body).toHaveProperty('description')
  // Then: 驗證 response
  const response = await request.response()
  expect(response!.status()).toBeLessThan(400)
})
```

### 反面教材

```typescript
// ❌ 走到 submit 就停（沒實際送出）
test('表單流程驗證', async ({ page }) => {
  // ...填完表單...
  await expect(submitBtn).toBeVisible()  // 到這裡就結束
})

// ❌ 直接打 API 繞過前端（沒測組裝邏輯）
test('inquiry 建立', async ({ request }) => {
  const resp = await request.post('/api/inquiries', { data: {...} })
})

// ❌ 只驗 UI 欄位顯示（沒驗送出後 payload）
test('詢價表單顯示欄位', async ({ page }) => {
  await expect(page.locator('[name="body_part"]')).toBeVisible()
})
```

### 判斷標準

| 情境 | 需要 Full Submit Test？ |
|------|----------------------|
| 前端有表單 + 後端有對應 API | **必須** |
| 前端只是顯示資料（Profile 頁、列表） | 不需要 |
| 只改後端 API（前端沒動） | API test 即可 |
| 表單有多種模式（如詢價類型） | **每種模式至少一個** |

### 高風險區域：Payload 組裝邏輯

前端把多個表單欄位組裝成一個 object 再送出是 bug 高發區。
如果組件裡有這類組裝邏輯，**必須有 E2E 驗證組裝後的 payload**，不能只驗個別欄位顯示。

常見陷阱：
- 條件欄位（選了 A 才出現 B）沒寫進 payload
- API 回傳值大小寫與 select option 不匹配
- 狀態更新時機不對導致送出時欄位為空

## Step 6: Test Code Review（MANDATORY — 測試也要 review）

### 背景

寫 code 有 code review，寫測試卻沒有。這導致假測試（assertion 被吞、`|| true`、
零斷言截圖、try/catch 吃 error）長期潛伏在 CI 裡，報告永遠綠燈。

### 規則：QA 寫完 E2E 後，必須由 qa-manager agent review

| 步驟 | 負責 | 說明 |
|------|------|------|
| 寫 E2E test | QA agent | 從 BDD 翻譯 |
| **Review E2E test** | **qa-manager agent** | 檢查假測試 pattern |
| 修復 review 問題 | QA agent | 在同一 branch 修 |
| 確認通過 | qa-manager | 標記 PASS 才能 merge |

### Review Checklist（qa-manager 必檢項目）

**斷言完整性**
- [ ] 每個 `test()` 都有至少一個 `expect()`（不能只有 screenshot）
- [ ] 沒有 `|| true`、`|| false` 等短路邏輯讓斷言永遠通過
- [ ] 沒有 `try/catch` 吞掉 assertion error（catch 裡必須 `throw e`）
- [ ] `test.skip()` 有明確原因和對應的 ticket，不能無限期 skip

**測試深度**
- [ ] 表單功能有 Full Submit Test（Step 5 的規則）
- [ ] API-only test 沒有偽裝成 UI E2E（標題和實作一致）
- [ ] 條件性 action（`if (btn.isVisible())`）不會讓測試在元素不存在時靜默 PASS

**資料管理**
- [ ] `beforeAll` 建立的資料在 `afterAll` 清理
- [ ] 不依賴 staging 殘留資料（用 Tier 1 自建或 dev-login API）

### 常見假測試 Pattern（一看到就 REJECT）

```typescript
// ❌ 永遠 PASS
const changed = value !== other || true

// ❌ 吞 assertion error
try { expect(x).toBe(y) } catch(e) { record('FAIL', e) }

// ❌ 零斷言
test('RI-001', async ({ page }) => {
  await page.goto(url)
  await page.screenshot({ path: '...' })
})

// ❌ 條件性跳過核心斷言
if (await btn.isVisible().catch(() => false)) {
  await btn.click()
  // ...assertions...
}
// else: 什麼都不驗，測試 PASS

// ❌ fallback 斷言太寬
expect(await page.locator('button').count()).toBeGreaterThan(0)
```

## 絕對禁止

- 不讀 BDD 就寫 E2E（必須從 BDD file 出發）
- 缺資料就跳過測試（必須 STOP + 開 ticket）
- 看 code 寫 BDD（BDD 是需求文件，不是 code 描述）
- 用 curl 手動測 API 當報告
- 只截圖不寫斷言
- 驗證「按鈕存在」就標 PASS
- E2E 測試不做 cleanup（必須清理測試資料）
- **表單功能只用 API test 不走 UI**（必須有至少一個 Full Submit Test）
- **表單 E2E 走到 submit 按鈕就停**（必須實際送出並驗證 payload）
