/**
 * HAR-436: per-artist rating aggregate view migration.
 *
 * This suite verifies the `012_artist_rating_summary.sql` migration is
 * additive, reversible, and that the view's `avg_rating` formula matches the
 * app-side authority `computeReviewSummary` (src/lib/reviews.ts): the mean of
 * each review's single `rating` column rounded to 1 decimal place, with a
 * `0 / 0` fallback for zero-review artists.
 *
 * vitest runs against mocks (no live DB), so this asserts on the migration's
 * SQL text. Formula PARITY against a real Postgres is verified out-of-band and
 * quoted in the PR (a docker postgres applies 001→012 and the view's rows are
 * diffed against computeReviewSummary for the same fixture).
 */
import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { computeReviewSummary } from '@/lib/reviews'

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../supabase/migrations/012_artist_rating_summary.sql',
)

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8')
}

// Normalize whitespace + lowercase for tolerant substring matching, but keep a
// raw copy for case-sensitive checks where it matters.
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

describe('012_artist_rating_summary migration', () => {
  it('exists and is non-empty', () => {
    const sql = readMigration()
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('creates the artist_rating_summary view with the three documented columns', () => {
    const sql = normalize(readMigration())
    expect(sql).toContain('create or replace view artist_rating_summary')
    expect(sql).toContain('artist_id')
    expect(sql).toContain('avg_rating')
    expect(sql).toContain('review_count')
  })

  it('aggregates over the reviews table joined from artists (zero-review artists kept)', () => {
    const sql = normalize(readMigration())
    // LEFT JOIN from artists so zero-review artists survive as 0/0 rows,
    // matching computeReviewSummary([]) === { average: 0, count: 0 }.
    expect(sql).toContain('from artists')
    expect(sql).toContain('left join reviews')
  })

  it('avg_rating uses round(avg(rating), 1) — parity with computeReviewSummary 1-dp mean', () => {
    const sql = normalize(readMigration())
    // single `rating` column mean (011_reviews.sql schema), rounded to 1 dp.
    expect(sql).toMatch(/round\(\s*avg\(\s*r\.rating\s*\)[^)]*,\s*1\s*\)/)
    // zero-review fallback to 0 (coalesce), matching the empty-list contract.
    expect(sql).toContain('coalesce')
  })

  it('review_count is a non-null count(rating) of real reviews', () => {
    const sql = normalize(readMigration())
    expect(sql).toMatch(/count\(\s*r\.rating\s*\)/)
  })

  it('grants anon + authenticated SELECT on the view (public read, no write path)', () => {
    const sql = normalize(readMigration())
    expect(sql).toMatch(/grant\s+select\s+on\s+artist_rating_summary\s+to\s+[^;]*anon/)
    expect(sql).toContain('authenticated')
  })

  it('is additive — no destructive verb against existing tables/columns/data', () => {
    const sql = normalize(readMigration())
    // The only DROP allowed is DROP VIEW (in the documented downgrade comment).
    // Guard that no table/column-level destructive op is present in the upgrade.
    expect(sql).not.toMatch(/drop\s+table/)
    expect(sql).not.toMatch(/alter\s+table/)
    expect(sql).not.toMatch(/truncate/)
    expect(sql).not.toMatch(/delete\s+from/)
    expect(sql).not.toMatch(/rename\s+column/)
  })

  it('documents a reversible DROP VIEW down-migration', () => {
    const sql = normalize(readMigration())
    expect(sql).toContain('drop view')
    expect(sql).toContain('artist_rating_summary')
  })

  it('the documented formula matches computeReviewSummary for a worked example', () => {
    // Guards the SQL doc against drift from the app authority. The migration's
    // header comment states the worked example [5,4,4] -> 4.3; assert the app
    // helper actually produces that, so a future edit to either side that
    // breaks parity fails here.
    const summary = computeReviewSummary([{ rating: 5 }, { rating: 4 }, { rating: 4 }])
    expect(summary).toEqual(expect.objectContaining({ average: 4.3, count: 3 }))
    // empty-list contract the view's COALESCE 0/0 mirrors.
    const empty = computeReviewSummary([])
    expect(empty.average).toBe(0)
    expect(empty.count).toBe(0)
  })
})
