import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_BUCKETS = ['portfolio', 'inquiries', 'avatars'] as const

const uploadRequestSchema = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  filename: z.string().min(1),
  content_type: z.enum(ALLOWED_TYPES),
})

export type UploadRequest = z.infer<typeof uploadRequestSchema>

export function validateUploadRequest(input: unknown) {
  return uploadRequestSchema.safeParse(input)
}

export async function createSignedUploadUrl(
  bucket: string,
  userId: string,
  filename: string,
  _contentType: string,
): Promise<{ signed_url: string; public_url: string; path: string }> {
  const supabase = await createServerClient()
  const ext = filename.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    signed_url: data.signedUrl,
    public_url: publicUrlData.publicUrl,
    path,
  }
}

/** Resolves a Supabase Storage object path from its public URL, or null if it
 * doesn't belong to `bucket` (or isn't a public storage URL at all). */
export function extractStoragePath(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

/** Best-effort delete of the `portfolio` bucket objects referenced by `urls`
 * (nulls/unresolvable urls are skipped). Used when a portfolio_items row is deleted. */
export async function deletePortfolioStorageObjects(
  admin: SupabaseClient<Database>,
  urls: Array<string | null | undefined>,
): Promise<void> {
  const paths = urls
    .map((url) => extractStoragePath('portfolio', url))
    .filter((p): p is string => p !== null)
  if (paths.length === 0) return
  await admin.storage.from('portfolio').remove(paths)
}
