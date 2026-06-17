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

- **Zod `z.string().uuid()` test fixtures need a real RFC-4122 UUID.** An
  all-`1`s placeholder like `1111…-1111-1111-…` FAILS validation (the variant
  nibble must be 8/9/a/b and the version nibble 1-8), so a route guarded by such
  a schema silently 400s a "valid" test body. Use a well-formed UUID, e.g.
  `11111111-1111-4111-8111-111111111111` (v4, variant 8). Why: cost ~20min on
  HAR-416 — the route's happy-path tests returned 400 not 201. Evidence: HAR-416
  (`src/app/api/artists/[slug]/reviews/__tests__/route.test.ts`).
- **An unresolved async CHILD silently blanks the whole RTL render.** When the
  consuming test `await`s an async server component, any nested async child
  (e.g. `ArtistCard` renders the async `PriceRange`) returns an unsettled
  Promise that React's sync `render()` drops — the body collapses to `<div />`
  and every `getByText` fails with no useful error. Fix: `vi.mock` each async
  child to a sync stub (`() => null`). Also, an async branch that returns
  `<AsyncChild/>` as an element won't resolve under a single top-level `await`;
  make it `return AsyncChild({ ...props })` so the awaited tree is fully
  settled. Evidence: HAR-417 `ArtistCard.test.tsx` (mocks `../PriceRange`;
  compact branch returns `CompactCard({ artist })`).
- **A user keyword fed into a PostgREST `.or()` filter string MUST be escaped —
  `.or()` is comma-delimited at the top level and `ilike` treats `%`/`_` as
  wildcards.** Backslash-escape `\` first (it is the LIKE escape char), then
  `%`, `_`, and `,`; an unescaped comma splits the filter into extra OR branches
  and an unescaped `%`/`_` widens (or breaks) the match. Resolve the `.or(...)`
  string ONCE and apply the SAME string to BOTH the count and data query (like
  `budgetPredicate`/`serviceColumn`) or `total` drifts from the rows returned.
  In the artists query test, add `chain.or = vi.fn().mockReturnValue(chain)` to
  `makeThenable` so the new call doesn't break the chain. Evidence: HAR-455
  (`getArtists` `q`/`searchPredicate`/`escapeSearchTerm`; PR pending).
