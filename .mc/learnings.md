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
- **A user keyword fed into a PostgREST `.or()` filter VALUE must be escaped in
  TWO layers — a per-char backslash allowlist alone is INCOMPLETE.** (HAR-458
  supersedes the HAR-455 backslash-only rule: the allowlist missed `*` (a
  documented `like`/`ilike` alias for `%` → widens the match) and the structural
  grammar chars `( ) :` (an embedded `)` can close the supabase-js-added `.or()`
  paren group early → malformed filter / 400).) The COMPLETE, docs-aligned fix:
  1. **SQL-LIKE layer** — escape `\` first (LIKE escape char), then `%` and `_`
     so the user's literal wildcards match literally (PostgREST passes these
     straight to Postgres LIKE; double-quoting does NOT neutralize them).
  2. **PostgREST-grammar layer** — double-quote-WRAP the whole `%term%` value
     (`display_name.ilike."%term%",bio.ilike."%term%"`); inside the quotes only
     `"` (→ `\"`) and `\` (→ `\\`) need escaping, and `* ( ) : ,` all become
     inert. Do NOT escape the comma per-char — quoting handles it.
  Keep the `%…%` framing OUTSIDE the user term (it's the real substring
  wildcard). Resolve the `.or(...)` string ONCE and apply the SAME string to
  BOTH the count and data query (like `budgetPredicate`/`serviceColumn`) or
  `total` drifts. In the artists query test, `makeThenable` already wires
  `chain.or = vi.fn().mockReturnValue(chain)`. NOTE: a user `\` ends up as FOUR
  backslashes in the `.or` string (LIKE-escaped `\\` then quote-escaped to
  `\\\\`) — verify expected test literals with a round-trip script, don't
  hand-count. Evidence: HAR-458 (`searchPredicate`/`escapeSearchTerm`/
  `quotePostgrestValue`; PR pending). Live-staging semantics gate still open —
  the suite is fully mocked, so `?q=*`/`?q=)`/literal `?q=%` need a staging smoke.
- **The canonical `/artists` filter unions (`ArtistSort`/`ArtistBudget`/
  `ArtistService`) live in `src/lib/supabase/queries/artists.ts`, NOT in
  `validations/listing.ts`** — the validator imports them as types and its
  `ARTIST_SORTS`/`…` const arrays must stay in sync. Adding a new sort/budget
  value (a "parser-only" slice) therefore REQUIRES editing the type in
  `artists.ts` too, or `tsc --noEmit` (a CI gate) fails on the `as ArtistSort`
  cast — this is NOT a `getArtists` behavior edit and stays in-scope. The query
  `switch (filters?.sort)` has a `default` branch (no exhaustive `never`), so an
  unhandled new value safely falls through to the `featured` default. Also: an
  existing test may assert the new value coerces to the default (e.g.
  `parse('rating') === 'featured'`); that single assertion MUST flip when you
  add the value — it is not a "keep existing cases green" violation. Evidence:
  HAR-474 (added `'rating'`; PR pending).
- **`getArtists` can `.order`/`.gte` against an embedded VIEW column even though
  the view is absent from `database.ts` (`Views: { [_ in never]: never }`).**
  To order/filter the WHOLE artist set by `artist_rating_summary.avg_rating`,
  embed it in the select (`artist_rating_summary!inner(avg_rating, review_count)`)
  and use `.order('avg_rating', { foreignTable: 'artist_rating_summary',
  ascending: false, nullsFirst: false })` + `.gte('avg_rating', n)`. `tsc` does
  NOT reject `avg_rating`/the view name (the result is `as unknown as` cast and
  the conditional-`.select()` ternary widens the builder), so no
  `database.ts`/codegen change is needed. Embed ONLY when a rating facet is
  active (ternary on the select) so the unfiltered query stays byte-identical.
  Apply the `.gte` to BOTH the count and data queries (like
  `budgetPredicate`/`searchPredicate`) or `total` drifts. The view COALESCEs
  zero-review artists to `avg_rating = 0` (not null), so `descending +
  nullsFirst:false` already sinks both 0-rated and null-aggregate artists last.
  Mocked-suite caveat: the live PostgREST `!inner` + embedded-column-filter
  semantics aren't exercised by the unit test — a staging smoke is the final
  confirmation. Evidence: HAR-475 (`ARTIST_RATING_EMBED`; PR pending).
- **To restrict parent rows by a child relationship that is ALREADY embedded
  unaliased for rendering, add a SEPARATE ALIASED `!inner` embed — never put
  `!inner` on the existing embed.** `ARTIST_PUBLIC_SELECT` embeds
  `portfolio_items(*)` for the card; a bare `portfolio_items!inner(...)` +
  `.not('portfolio_items.col', 'is', null)` would narrow THAT rendered embed to
  matching children only (artist loses their non-matching portfolio items).
  Fix: embed `healed_proof:portfolio_items!inner(id)` and filter
  `.not('healed_proof.col', 'is', null)` — the alias restricts WHICH PARENTS
  survive while the unaliased `portfolio_items(*)` stays complete. Gate the
  alias behind the facet (compose embeds into one comma-joined string so rating
  + healed can both be active) and apply the `.not` to BOTH count and data
  queries or `total` drifts. `tsc` accepts the aliased embed + `.not` (select is
  `as unknown as` cast). Mocked-suite caveat: live alias-scoped filter semantics
  need a staging smoke. Evidence: HAR-480 (`HEALED_PROOF_EMBED`; PR pending).
- **A STANDALONE `.from(<view>)` read of a view absent from `database.ts`
  (`Views: never`) needs a double cast — `as never` on the table name alone does
  NOT type the result.** `supabase.from('artist_saved_count' as never)` compiles
  but the chained `.select().in()` returns `never`, so cast the post-`.select()`
  builder: `(supabase.from('v' as never).select('cols') as unknown as { in: (c:
  string, ids: string[]) => Promise<{ data: Row[] | null; error: unknown }> })
  .in('artist_id', ids)`, then map through a hand-written `Row` interface. This is
  the read-helper analogue of the HAR-475/480 EMBED rules (those cast the whole
  `getArtists` result; here the helper is its own `.from`). The helper degrades to
  an empty map on error/null so a missing view is safe; the unit test is fully
  mocked, so a staging smoke confirms real rows. Evidence: HAR-484
  (`getSavedCountsByArtistIds`; PR pending).
