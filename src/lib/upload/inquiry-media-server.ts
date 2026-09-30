import type { AuthUser } from '@/lib/auth/identity'
import { createAdminClient } from '@/lib/supabase/server'
import {
  buildProtectedInquiryMediaUrl,
  parseInquiryMediaPath,
} from './inquiry-media'

const SIGNED_READ_TTL_SECONDS = 60

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

/** Caller must already be authenticated. Access is granted to the uploader or
 * either participant of an inquiry that references the exact object. */
export async function canReadInquiryMedia(user: AuthUser, path: string): Promise<boolean> {
  const parsedPath = parseInquiryMediaPath(`/api/media/inquiries/${path}`)
  if (!parsedPath) return false

  const [owner] = parsedPath.split('/')
  // New objects use the opaque Auth UID. Pre-v2 objects used the LINE ID in
  // their path; retain owner access to those private legacy uploads.
  if (owner === user.supabaseId || owner === user.lineUserId) return true

  const admin = createAdminClient()
  const protectedUrl = buildProtectedInquiryMediaUrl(parsedPath)
  const legacyPublicUrl = admin.storage.from('inquiries').getPublicUrl(parsedPath).data.publicUrl
  const candidates = unique([protectedUrl, legacyPublicUrl])

  const [messageResult, artistResult, ...referenceResults] = await Promise.all([
    admin
      .from('messages')
      .select('inquiry_id')
      .eq('message_type', 'image')
      .in('content', candidates),
    admin
      .from('artists')
      .select('id')
      .eq('line_user_id', user.lineUserId)
      .maybeSingle(),
    ...candidates.map((candidate) =>
      admin
        .from('inquiries')
        .select('id, artist_id, consumer_line_id')
        .contains('reference_images', JSON.stringify([candidate])),
    ),
  ])

  if (messageResult.error || artistResult.error || referenceResults.some((result) => result.error)) {
    throw new Error('Failed to authorize inquiry media')
  }

  const inquiryIds = unique([
    ...(messageResult.data ?? []).map((message) => message.inquiry_id),
    ...referenceResults.flatMap((result) => (result.data ?? []).map((inquiry) => inquiry.id)),
  ])
  if (inquiryIds.length === 0) return false

  const { data: inquiries, error } = await admin
    .from('inquiries')
    .select('id, artist_id, consumer_line_id')
    .in('id', inquiryIds)
  if (error) throw new Error('Failed to authorize inquiry media')

  const artistId = artistResult.data?.id ?? null
  return (inquiries ?? []).some(
    (inquiry) =>
      inquiry.consumer_line_id === user.lineUserId ||
      (artistId !== null && inquiry.artist_id === artistId),
  )
}

export async function createSignedInquiryMediaReadUrl(path: string): Promise<string> {
  const parsedPath = parseInquiryMediaPath(`/api/media/inquiries/${path}`)
  if (!parsedPath) throw new Error('Invalid inquiry media path')

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('inquiries')
    .createSignedUrl(parsedPath, SIGNED_READ_TTL_SECONDS)
  if (error || !data) throw new Error('Failed to create inquiry media read URL')
  return data.signedUrl
}
