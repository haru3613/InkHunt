/**
 * HAR-528 (v0.11 W1 Slice A): additive `inquiries.budget_range` column.
 *
 * Verifies `014_inquiry_budget_range.sql` adds ONE nullable `budget_range text`
 * column to the existing `inquiries` table — purely additive, no default, no
 * CHECK, no backfill — so existing rows keep `budget_range IS NULL` and the
 * migration is trivially reversible (`DROP COLUMN`).
 *
 * vitest runs against no live DB, so this asserts on the migration's SQL text.
 * Live PostgREST semantics are confirmed out-of-band (docker postgres applies
 * 001→014) and quoted in the PR.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../supabase/migrations/014_inquiry_budget_range.sql',
)

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8')
}

// Normalize whitespace + lowercase for tolerant substring matching.
function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase()
}

// Strip SQL line comments (-- …) so the documented DROP COLUMN downgrade note
// is not mistaken for an executed destructive statement.
function executable(sql: string): string {
  return normalize(
    sql
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n'),
  )
}

describe('014_inquiry_budget_range migration', () => {
  it('exists and is non-empty', () => {
    const sql = readMigration()
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('adds a nullable budget_range text column to inquiries', () => {
    const sql = executable(readMigration())
    expect(sql).toMatch(
      /alter\s+table\s+(if\s+exists\s+)?inquiries\s+add\s+column\s+(if\s+not\s+exists\s+)?budget_range\s+text/,
    )
  })

  it('keeps the column purely additive — no NOT NULL, no DEFAULT, no CHECK', () => {
    const sql = executable(readMigration())
    // No constraints on the added column: nullable, no default value, no CHECK.
    expect(sql).not.toContain('not null')
    expect(sql).not.toContain('default')
    expect(sql).not.toContain('check')
  })

  it('is non-destructive — no drop/truncate/delete/rename against existing data', () => {
    const sql = executable(readMigration())
    expect(sql).not.toMatch(/drop\s+table/)
    expect(sql).not.toMatch(/drop\s+column/)
    expect(sql).not.toMatch(/truncate/)
    expect(sql).not.toMatch(/delete\s+from/)
    expect(sql).not.toMatch(/rename\s+column/)
    // No backfill: the column is left NULL for existing rows.
    expect(sql).not.toMatch(/update\s+inquiries/)
  })

  it('documents the reversible DROP COLUMN down-migration in a comment', () => {
    const sql = normalize(readMigration())
    expect(sql).toContain('drop column')
    expect(sql).toContain('budget_range')
  })
})
