import { z } from 'zod'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { Json, Inquiry, Message } from '@/types/database'

const inquiryCreateSchema = z.object({
  artist_id: z.string().uuid(),
  description: z.string().min(10, '請至少描述 10 個字').max(1000),
  reference_images: z.array(z.string().url()).max(3).default([]),
  body_part: z.string().min(1).optional(),
  size_estimate: z.string().min(1).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: 'budget_min must be <= budget_max', path: ['budget_min'] },
)

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>

export function validateInquiryCreate(input: unknown) {
  return inquiryCreateSchema.safeParse(input)
}

export async function createInquiry(
  consumerLineId: string,
  consumerName: string | null,
  data: InquiryCreateInput,
): Promise<{ inquiry: Inquiry; messages: Message[] }> {
  const admin = createAdminClient()

  const { data: inquiry, error: inquiryError } = await admin
    .from('inquiries')
    .insert({
      artist_id: data.artist_id,
      consumer_line_id: consumerLineId,
      consumer_name: consumerName,
      description: data.description,
      reference_images: data.reference_images,
      body_part: data.body_part ?? null,
      size_estimate: data.size_estimate ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
    })
    .select()
    .single()

  if (inquiryError || !inquiry) {
    throw new Error(`Failed to create inquiry: ${inquiryError?.message}`)
  }

  const summaryParts = [
    '新詢價',
    data.body_part ? `部位：${data.body_part}` : null,
    data.size_estimate ? `大小：${data.size_estimate}` : null,
    data.budget_min || data.budget_max
      ? `預算：NT$${data.budget_min ?? '?'} ~ NT$${data.budget_max ?? '?'}`
      : null,
    `\n${data.description}`,
  ].filter(Boolean).join('\n')

  const messagesToInsert: Array<{
    inquiry_id: string
    sender_type: 'system' | 'consumer'
    sender_id: string | null
    message_type: 'system' | 'image'
    content: string
    metadata: Json
  }> = [
    {
      inquiry_id: inquiry.id,
      sender_type: 'system',
      sender_id: null,
      message_type: 'system',
      content: summaryParts,
      metadata: {
        body_part: data.body_part ?? null,
        size_estimate: data.size_estimate ?? null,
        budget_min: data.budget_min ?? null,
        budget_max: data.budget_max ?? null,
      } as Json,
    },
  ]

  for (const imageUrl of data.reference_images) {
    messagesToInsert.push({
      inquiry_id: inquiry.id,
      sender_type: 'consumer',
      sender_id: consumerLineId,
      message_type: 'image',
      content: imageUrl,
      metadata: {} as Json,
    })
  }

  const { data: messages, error: msgError } = await admin
    .from('messages')
    .insert(messagesToInsert)
    .select()

  if (msgError) {
    throw new Error(`Failed to create initial messages: ${msgError.message}`)
  }

  return { inquiry, messages: messages ?? [] }
}

type InquiryStatus = 'pending' | 'quoted' | 'accepted' | 'closed'

export async function getInquiriesForArtist(
  artistId: string,
  status?: InquiryStatus,
  page = 1,
  limit = 20,
): Promise<{ data: Inquiry[]; total: number }> {
  const supabase = await createServerClient()
  let query = supabase
    .from('inquiries')
    .select('*', { count: 'exact' })
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) throw new Error(`Failed to fetch inquiries: ${error.message}`)
  return { data: data ?? [], total: count ?? 0 }
}

export async function getInquiriesForConsumer(
  consumerLineId: string,
  page = 1,
  limit = 20,
): Promise<{ data: Inquiry[]; total: number }> {
  const supabase = await createServerClient()
  const { data, count, error } = await supabase
    .from('inquiries')
    .select('*', { count: 'exact' })
    .eq('consumer_line_id', consumerLineId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw new Error(`Failed to fetch inquiries: ${error.message}`)
  return { data: data ?? [], total: count ?? 0 }
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const supabase = await createServerClient()
  const { data } = await supabase.from('inquiries').select('*').eq('id', id).single()
  return data
}

export async function updateInquiryStatus(
  id: string,
  status: 'pending' | 'quoted' | 'accepted' | 'closed',
): Promise<Inquiry> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inquiries')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to update inquiry: ${error?.message}`)
  return data
}
