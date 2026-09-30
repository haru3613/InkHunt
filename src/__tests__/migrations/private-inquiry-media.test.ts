import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/020_private_inquiry_media.sql'),
  'utf8',
).toLowerCase()

describe('020 private inquiry media migration', () => {
  it('makes only the inquiries bucket private with an image type and 5 MB limit', () => {
    expect(sql).toMatch(/update\s+storage\.buckets[\s\S]*public\s*=\s*false/)
    expect(sql).toContain('file_size_limit = 5242880')
    expect(sql).toContain("'image/jpeg'")
    expect(sql).toContain("'image/png'")
    expect(sql).toContain("'image/webp'")
    expect(sql).not.toMatch(/where\s+id\s*=\s*'(?:portfolio|avatars)'/)
  })

  it('removes broad read/upload policies and scopes direct access to auth.uid()', () => {
    expect(sql).toContain('drop policy if exists "public read access for inquiries"')
    expect(sql).toContain('drop policy if exists "authenticated can read own inquiries"')
    expect(sql).toContain('drop policy if exists "authenticated can upload inquiries"')
    expect(sql).toMatch(/create policy "users can read own inquiry uploads"[\s\S]*auth\.uid\(\)::text/)
    expect(sql).toMatch(/create policy "authenticated users can upload to inquiries"[\s\S]*auth\.uid\(\)::text/)
  })
})
