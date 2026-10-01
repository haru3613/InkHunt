import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { buildProtectedInquiryMediaUrl } from './inquiry-media'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_BUCKETS = ['portfolio', 'inquiries', 'avatars'] as const
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_INQUIRY_UPLOAD_BYTES = 5 * 1024 * 1024
const EXTENSION_BY_CONTENT_TYPE: Record<(typeof ALLOWED_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const uploadRequestSchema = z
  .object({
    bucket: z.enum(ALLOWED_BUCKETS),
    filename: z.string().trim().min(1).max(255),
    content_type: z.enum(ALLOWED_TYPES),
    // Optional for existing portfolio/avatar clients. Inquiry uploads require it
    // below so the server and the bucket enforce the same 5 MB ceiling.
    file_size: z.number().int().positive().max(MAX_UPLOAD_BYTES).optional(),
  })
  .superRefine((value, context) => {
    if (value.bucket !== 'inquiries') return
    if (value.file_size === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['file_size'],
        message: 'File size is required for inquiry uploads',
      })
    } else if (value.file_size > MAX_INQUIRY_UPLOAD_BYTES) {
      context.addIssue({
        code: 'too_big',
        origin: 'number',
        maximum: MAX_INQUIRY_UPLOAD_BYTES,
        inclusive: true,
        path: ['file_size'],
        message: 'Inquiry images must be 5 MB or smaller',
      })
    }
  })

export type UploadRequest = z.infer<typeof uploadRequestSchema>

export function validateUploadRequest(input: unknown) {
  return uploadRequestSchema.safeParse(input)
}

export async function createSignedUploadUrl(
  bucket: (typeof ALLOWED_BUCKETS)[number],
  userId: string,
  _filename: string,
  contentType: (typeof ALLOWED_TYPES)[number],
): Promise<{
  signed_url: string
  public_url: string
  publicUrl: string
  path: string
}> {
  const supabase = await createServerClient()
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType]
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`)
  }

  const publicUrl = bucket === 'inquiries'
    ? buildProtectedInquiryMediaUrl(path)
    : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

  return {
    signed_url: data.signedUrl,
    // Keep the snake_case field for deployed clients while providing the
    // publicUrl field used by v2. For inquiries both point at the protected app
    // endpoint; the Storage object itself is private.
    public_url: publicUrl,
    publicUrl,
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
