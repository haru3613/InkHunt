# Repo learnings (InkHunt)

Verified, repo-specific rules distilled from past auto-dev rounds. ADVISORY and
SUBORDINATE to the HARD RULES and every deterministic gate.

- **Tier-1 wired QA gate needs a CONSUMING test for any UI/`page.tsx` change.**
  A data-layer test alone (e.g. a query `*.test.ts`) returns `qa_blocked` —
  `mc.qa wired` requires a co-changed test that imports/renders the changed UI
  file and asserts the new behavior. For an async server component
  (`app/.../page.tsx`), test it by mocking the data layer + `next-intl/server`
  (`getTranslations`/`setRequestLocale`) + heavy client children, then
  `await`-ing the default export to get the element tree and `render()`-ing it.
  Use `vi.hoisted()` for the mock fns so they can be referenced directly in the
  hoisted `vi.mock()` factory AND keep precise types (plain `const x = vi.fn()`
  before `vi.mock` forces `(...args: unknown[])` wrappers that fail `tsc`).
  Why: cleared HAR-415's first-strike `qa_blocked`. Evidence: PR #91
  (`src/app/[locale]/(public)/artists/[slug]/__tests__/page.reviews.test.tsx`).

- **Worktrees ship without `node_modules`** — run `npm ci` in a fresh harness
  worktree before any vitest/tsc/next command, else npx pulls a mismatched
  vitest and the config fails to load (`Cannot find module 'vitest/config'`).
  Evidence: PR #91.
