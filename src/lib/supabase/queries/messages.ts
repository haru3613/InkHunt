import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { Json, Message } from '@/types/database'

export async function getUnreadCountsForUser(
  userLineId: string,
  inquiryIds: string[],
): Promise<Map<string, number>> {
  if (inquiryIds.length === 0) return new Map()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('messages')
    .select('inquiry_id')
    .in('inquiry_id', inquiryIds)
    .neq('sender_id', userLineId)
    .is('read_at', null)

  if (error) throw new Error(`Failed to fetch unread counts: ${error.message}`)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    counts.set(row.inquiry_id, (counts.get(row.inquiry_id) ?? 0) + 1)
  }
  return counts
}

export async function getMessagesByInquiry(inquiryId: string): Promise<Message[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
  return data ?? []
}

export async function sendMessage(
  inquiryId: string,
  senderType: 'consumer' | 'artist',
  senderId: string,
  messageType: 'text' | 'image',
  content: string,
): Promise<Message> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: senderType,
      sender_id: senderId,
      message_type: messageType,
      content,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to send message: ${error?.message}`)
  return data
}

export async function sendSystemMessage(
  inquiryId: string,
  content: string,
  metadata: Json = {},
): Promise<Message> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: 'system',
      sender_id: null,
      message_type: 'system',
      content,
      metadata,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to send system message: ${error?.message}`)
  return data
}

export async function markMessagesAsRead(
  inquiryId: string,
  _userId: string,
  userType: 'consumer' | 'artist',
): Promise<void> {
  const supabase = await createServerClient()
  const otherTypes: Array<'consumer' | 'artist' | 'system'> =
    userType === 'consumer' ? ['artist', 'system'] : ['consumer', 'system']

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('inquiry_id', inquiryId)
    .in('sender_type', otherTypes)
    .is('read_at', null)
}

export async function getUnreadCountByInquiry(
  inquiryId: string,
  userType: 'consumer' | 'artist',
): Promise<number> {
  const supabase = await createServerClient()
  const otherTypes: Array<'consumer' | 'artist' | 'system'> =
    userType === 'consumer' ? ['artist', 'system'] : ['consumer', 'system']

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('inquiry_id', inquiryId)
    .in('sender_type', otherTypes)
    .is('read_at', null)

  return count ?? 0
}
