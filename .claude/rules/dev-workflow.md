# Dev Workflow — MANDATORY

所有 feature 開發必須遵循此流程。

```
Requirement → Design/Spec → Plan → Implement (TDD) → Code Review → /simplify → QA
```

## Phase 1: Requirements

1. 讀需求（Obsidian spec、產品計劃、用戶描述）
2. 確認 user persona（消費者？刺青師？管理員？）
3. 定義 acceptance criteria
4. 列出影響範圍（哪些 API routes、哪些頁面、哪些 DB table）

## Phase 2: Plan + Implement (TDD)

### TDD 是必須的

| 層級 | 工具 | 負責 |
|------|------|------|
| Unit test | Vitest | 開發者 |
| API test | Vitest + supertest | 開發者 |
| E2E | Playwright | QA agent |

### 覆蓋率要求：80%+

## Phase 3: Code Review + /simplify

1. 跑 **code-reviewer** agent（MANDATORY）
2. 修復 CRITICAL / HIGH issues
3. 跑 `/simplify` — 檢查 code reuse、quality、efficiency
4. 在同一 branch 修復

## Phase 4: QA

開發完成後交付 QA agent：
- 功能描述和驗收標準
- Branch name
- 測試資料準備狀態

## Checklist

開始前：
- [ ] 需求已確認
- [ ] 影響範圍已列出

完成前：
- [ ] Unit tests 通過（80%+ coverage）
- [ ] Code review 通過（CRITICAL/HIGH = 0）
- [ ] `/simplify` 已跑
- [ ] QA 交付清單齊全
