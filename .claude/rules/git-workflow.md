# Git Workflow — MANDATORY

## NEVER push directly to staging or main

All code changes MUST go through this flow:

1. `git worktree add .claude/worktrees/feat-xxx -b feat/xxx staging`
2. Develop and commit in the worktree
3. Run `/simplify` on the branch BEFORE pushing (fix issues in same branch)
4. **Push 前 rebase**: `git rebase origin/staging`（確保 PR 乾淨）
5. `git push -u origin feat/xxx`（如果 rebase 過則 `--force-with-lease`）
6. Open PR → **squash merge** to staging
7. `git worktree remove .claude/worktrees/feat-xxx`
8. After staging verified: open PR staging → main → **merge commit** (NOT squash)

## Push 前必須 Rebase（CRITICAL）

Push 前一律 rebase 到目標 branch，確保 PR 只顯示自己的 commits：

```bash
# Feature → staging 的 PR
git rebase origin/staging
git push --force-with-lease

# Staging → main 的 PR（如需要）
git rebase origin/main
git push --force-with-lease
```

**為什麼：** 不 rebase 的話，PR 會出現 phantom commits（已 merge 的舊 commits 重複出現），
搞到 PR 有幾十個不相關的 commit。rebase 後 PR 只會有你真正新增的 commits。

**Staging → main 仍然用 merge commit（不要 squash）**，
因為 squash 會讓 SHA 分叉，下一次 PR 又會累積 phantom commits。
Merge commit 讓兩邊 SHA 共享，長期最省事。

## Pre-merge checklist (BEFORE opening PR)

1. **`/simplify`** — review code reuse, quality, efficiency. Fix in same branch.
2. **`git rebase origin/staging`** — 確保 PR 乾淨，只有自己的 commits
3. **Run related tests** — `scripts/pre-push-check.sh` or manual pytest
4. **One PR per feature** — don't batch multiple features

## One feature = one branch = one PR

- 每個 feature 嚴格對應一個 branch 和一個 PR
- PR merge 後 branch 就結束，**絕不**在已 merge 的 branch 上繼續 commit
- 需要後續改動（補資料、修 bug）→ 從最新 staging 開新 branch
- 開 branch 前必須 `git fetch origin staging`，確保從最新 staging 分支

## NEVER do these

- `git push origin staging` (direct push)
- `git cherry-pick` (causes duplicate commits and conflicts)
- `git checkout staging && git commit` (working on staging directly)
- Jumping between multiple branches without worktrees
- Opening a separate PR for `/simplify` fixes (push to the original branch)
- Reusing a branch after its PR has been merged (開新 branch)
- Staging → main 用 squash merge（會造成 SHA 分叉 + phantom commits）

## Resolving staging → main PR conflicts

When PR staging → main shows phantom commits or conflicts:

```bash
# 方法 1：Rebase（推薦，最乾淨）
git checkout staging
git rebase origin/main
git push --force-with-lease origin staging
# PR 頁面會自動更新，只顯示新 commits

# 方法 2：Merge main INTO staging（如果 rebase 太複雜）
git checkout staging
git merge origin/main --no-ff --no-edit
git push origin staging
```

**Key rules:**
- 優先用 rebase，rebase 不了再用 merge
- Never force push main（staging 可以 force push）
- Staging → main 永遠用 merge commit，不要 squash

## Hotfix 流程（Production Bug）

Production bug **不走 staging**，直接從 main 修、合回 main。

### 原則

- **從 production 現在上線的版本切**（`origin/main`），不是 staging
- **只修 bug，不夾帶任何 feature、refactor、unrelated change**
- **先止血再根治**：能 rollback / 關 feature flag 先做
- **merge 回 main 後，auto-sync 會自動帶回 staging**

### 流程

```
1. 確認問題
   - 確認 bug 真的在 production 發生
   - 確認影響範圍
   - 評估是否先 rollback / 關 feature flag 止血

2. 從 main 切 hotfix branch
   git fetch origin main
   git worktree add .claude/worktrees/hotfix-xxx -b hotfix/xxx origin/main

3. TDD：先寫重現 bug 的 test（RED）
4. 做最小修復（GREEN）
5. 快速 code review（1 agent，不需完整 3 agent）
6. Push → PR to main（不是 staging）
7. CI 通過 → merge to main → Railway 自動部署
8. 驗證 production 修復
9. auto-sync workflow 自動 merge main → staging
```

### 跟 feature 的差別

| | Feature | Hotfix |
|---|---------|--------|
| 切分支來源 | `origin/staging` | `origin/main` |
| PR 目標 | staging | **main** |
| 可以夾帶其他改動 | 是 | **不行** |
| Code review | 完整 review | 快速 1 agent |
| /simplify | 必須 | 可跳過 |
| 回補主線 | N/A | auto-sync 自動處理 |

### NEVER do these in hotfix

- 從 staging 或 develop 切（會帶入未上線的改動）
- 順便 refactor / 換 library / 改 API format
- 跳過測試（至少要有重現 bug 的 test）
- 修完 production 忘了同步回 staging（auto-sync 會做，但要確認）

## Main working directory

Always stays on `staging` branch. Never commit here.
Only use worktrees for development.

## Session start checklist

1. Clean up any leftover worktrees: `git worktree list`
2. Pull latest: `git pull`
3. Create worktree for new work
