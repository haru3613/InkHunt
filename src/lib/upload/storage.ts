import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

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
