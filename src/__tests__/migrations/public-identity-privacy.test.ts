import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/022_public_identity_privacy.sql'),
  'utf8',
).toLowerCase()

function grantedColumns(table: 'artists' | 'reviews'): string {
  const match = sql.match(
    new RegExp(`grant\\s+select\\s*\\(([\\s\\S]*?)\\)\\s+on\\s+table\\s+public\\.${table}`),
  )
  if (!match) throw new Error(`Missing ${table} column grant`)
  return match[1]
}

describe('022 public identity privacy migration', () => {
  it('replaces broad artist SELECT with an explicit non-sensitive projection', () => {
    expect(sql).toMatch(/revoke\s+select\s+on\s+table\s+public\.artists\s+from\s+anon,\s*authenticated/)
    const columns = grantedColumns('artists')
    expect(columns).toContain('display_name')
    for (const privateColumn of [
      'line_user_id',
      'admin_note',
      'address',
      'lat',
      'lng',
      'quote_templates',
    ]) {
      expect(columns).not.toContain(privateColumn)
    }
  })

  it('keeps public review content but excludes the durable author identity', () => {
    expect(sql).toMatch(/revoke\s+select\s+on\s+table\s+public\.reviews\s+from\s+anon,\s*authenticated/)
    const columns = grantedColumns('reviews')
    expect(columns).toContain('rating')
    expect(columns).toContain('comment')
    expect(columns).not.toContain('author_line_user_id')
  })

  it('removes the legacy bucket-wide portfolio upload grant', () => {
    expect(sql).toContain('drop policy if exists "authenticated can upload portfolio"')
    expect(sql).not.toContain('drop policy if exists "public read access for portfolio"')
  })

  it('restores artist identity RLS through a parameterless pinned definer function', () => {
    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.current_artist_id\(\)[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*''/,
    )
    expect(sql).toContain('where auth.uid() is not null')
    expect(sql).toContain('a.line_user_id = public.current_line_user_id()')
    expect(sql).toContain(
      'revoke all on function public.current_artist_id() from public, anon, authenticated',
    )
    expect(sql).toContain(
      'grant execute on function public.current_artist_id() to authenticated',
    )
  })

  it('replaces obsolete UUID/LINE message joins with participant policies', () => {
    for (const obsoletePolicy of [
      'consumer can read own inquiry messages',
      'consumer can send messages to own inquiries',
      'consumer can mark messages read in own inquiries',
      'artist can read received inquiry messages',
      'artist can send messages to received inquiries',
      'artist can mark messages read in received inquiries',
      'linked users can read messages',
    ]) {
      expect(sql).toContain(`drop policy if exists "${obsoletePolicy}"`)
    }
    expect(sql).toContain('create policy "participants can read inquiry messages"')
    expect(sql).toContain('create policy "participants can send inquiry messages"')
    expect(sql).toContain('create policy "participants can mark inquiry messages read"')
    expect(sql).not.toMatch(/create policy[\s\S]*auth\.jwt\(\)\s*->>\s*'sub'/)
  })

  it('limits direct message mutations to normal inserts and read receipts', () => {
    expect(sql).toMatch(/revoke\s+insert,\s*update\s+on\s+table\s+public\.messages/)
    expect(sql).toMatch(/grant\s+insert\s*\([\s\S]*content[\s\S]*\)\s+on\s+table\s+public\.messages/)
    expect(sql).toContain('grant update (read_at) on table public.messages to authenticated')
  })

  it('removes the remaining invoker join from linked quote-request reads', () => {
    expect(sql).toContain('drop policy if exists "artist_read_linked_quote_requests"')
    expect(sql).toMatch(
      /create policy "artist_read_linked_quote_requests"[\s\S]*i\.artist_id\s*=\s*public\.current_artist_id\(\)/,
    )
  })
})
