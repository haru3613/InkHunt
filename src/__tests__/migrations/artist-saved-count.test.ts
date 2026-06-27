/**
 * HAR-483 (v0.7 W1): per-artist saved-count aggregate view migration.
 *
 * Verifies `013_artist_saved_count.sql` is additive, reversible, and shaped
 * exactly like the shipped `012_artist_rating_summary.sql` (HAR-436): a
 * read-only VIEW that aggregates the `favorites` table over the WHOLE artist
 * set, LEFT JOIN so zero-save artists survive as `saved_count = 0`.
 *
 * vitest runs against mocks (no live DB), so this asserts on the migration's
 * SQL text. Live PostgREST semantics are confirmed out-of-band (docker postgres
 * applies 001→013) and quoted in the PR.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../supabase/migrations/013_artist_saved_count.sql',
)

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8')
}

// Normalize whitespace + lowercase for tolerant substring matching.
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

describe('013_artist_saved_count migration', () => {
  it('exists and is non-empty', () => {
    const sql = readMigration()
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('creates the artist_saved_count view with artist_id + saved_count columns', () => {
    const sql = normalize(readMigration())
    expect(sql).toContain('create or replace view artist_saved_count')
    expect(sql).toContain('artist_id')
    expect(sql).toContain('saved_count')
  })

  it('aggregates favorites LEFT JOINed from artists (zero-save artists kept at 0)', () => {
    const sql = normalize(readMigration())
    // LEFT JOIN from artists so zero-save artists survive as saved_count = 0,
    // mirroring the rating view's zero-review handling.
    expect(sql).toContain('from artists')
    expect(sql).toContain('left join favorites')
  })

  it('saved_count is a count of favorite rows cast to int', () => {
    const sql = normalize(readMigration())
    expect(sql).toMatch(/count\(\s*f\.consumer_line_id\s*\)\s*::\s*int/)
  })

  it('groups by the artist id', () => {
    const sql = normalize(readMigration())
    expect(sql).toMatch(/group by a\.id/)
  })

  it('grants anon + authenticated SELECT on the view (public read, no write path)', () => {
    const sql = normalize(readMigration())
    expect(sql).toMatch(/grant\s+select\s+on\s+artist_saved_count\s+to\s+[^;]*anon/)
    expect(sql).toContain('authenticated')
  })

  it('is additive — no destructive verb against existing tables/columns/data', () => {
    const sql = normalize(readMigration())
    // The only DROP allowed is DROP VIEW (the documented downgrade).
    expect(sql).not.toMatch(/drop\s+table/)
    expect(sql).not.toMatch(/alter\s+table/)
    expect(sql).not.toMatch(/truncate/)
    expect(sql).not.toMatch(/delete\s+from/)
    expect(sql).not.toMatch(/rename\s+column/)
  })

  it('documents a reversible DROP VIEW down-migration', () => {
    const sql = normalize(readMigration())
    expect(sql).toContain('drop view if exists artist_saved_count')
  })
})
