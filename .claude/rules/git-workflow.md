# Git Workflow — MANDATORY

## Branch Strategy

```
main ← staging ← feature branches
```

- Feature → staging: **squash merge**
- Staging → main: **merge commit** (NOT squash)

## Feature 開發流程

1. `git worktree add .claude/worktrees/feat-xxx -b feat/xxx staging`
2. Develop and commit in the worktree
3. Run `/simplify` BEFORE pushing
4. Push 前 rebase: `git rebase origin/staging`
5. `git push -u origin feat/xxx`
6. Open PR → squash merge to staging
7. `git worktree remove .claude/worktrees/feat-xxx`
8. Staging verified → PR staging → main (merge commit)

## NEVER do these

- `git push origin main` (direct push to main — ALWAYS go through PR)
- `git push origin staging` (direct push to staging — ALWAYS go through PR)
- `git commit` on main or staging directly
- `git cherry-pick`
- Working on main or staging directly
- Staging → main 用 squash merge
- Reusing a branch after its PR has been merged

## One feature = one branch = one PR
