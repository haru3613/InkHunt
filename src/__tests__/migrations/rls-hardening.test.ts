import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/018_rls_hardening.sql'),
  'utf-8',
)

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').toLowerCase()
}

const normalized = normalize(sql)

describe('018_rls_hardening.sql', () => {
  it('drops the WITH CHECK (true) insert policies', () => {
    expect(normalized).toContain(
      'drop policy if exists "authenticated users can insert artists" on artists',
    )
    expect(normalized).toContain(
      'drop policy if exists "authenticated can create inquiries" on inquiries',
    )
  })

  it('drops the legacy permissive messages insert policy', () => {
    expect(normalized).toContain(
      'drop policy if exists "linked users can insert messages" on messages',
    )
  })

  it('revokes column-level UPDATE on artists.status and artists.featured', () => {
    expect(normalized).toContain(
      'revoke update (status, featured) on artists from anon, authenticated',
    )
  })

  it('switches both views to security_invoker and revokes write grants', () => {
    for (const view of ['artist_rating_summary', 'artist_saved_count']) {
      expect(normalized).toContain(
        `alter view ${view} set (security_invoker = true)`,
      )
      expect(normalized).toContain(
        `revoke insert, update, delete, truncate, references, trigger on ${view} from anon, authenticated`,
      )
    }
  })

  it('backfills line_user_id into raw_app_meta_data', () => {
    expect(normalized).toContain('update auth.users')
    expect(normalized).toContain(
      "jsonb_build_object('line_user_id', raw_user_meta_data->>'line_user_id')",
    )
    expect(normalized).toContain("raw_user_meta_data ? 'line_user_id'")
  })

  it('re-points current_line_user_id at app_metadata (not user_metadata)', () => {
    expect(normalized).toContain(
      "select auth.jwt()->'app_metadata'->>'line_user_id'",
    )
    expect(normalized).not.toContain("'user_metadata'->>'line_user_id'")
  })

  it('pins search_path on all three functions', () => {
    const count = (normalized.match(/set search_path = ''/g) ?? []).length
    expect(count).toBe(3)
  })

  it('schema-qualifies references inside current_artist_id', () => {
    expect(normalized).toContain('from public.artists')
    expect(normalized).toContain('public.current_line_user_id()')
  })
})
