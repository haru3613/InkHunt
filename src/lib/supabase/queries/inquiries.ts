import { z } from 'zod'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { BUDGET_RANGES } from '@/lib/validations/inquiry'
import {
  isOwnedInquiryMediaUrl,
  parseInquiryMediaPath,
} from '@/lib/upload/inquiry-media'
import type { Inquiry, Message } from '@/types/database'

export type InquiryMutationCode =
  | 'ARTIST_NOT_FOUND'
  | 'ARTIST_NOT_ACTIVE'
  | 'SELF_INQUIRY'
  | 'INQUIRY_NOT_FOUND'
  | 'INQUIRY_FORBIDDEN'
  | 'INVALID_INQUIRY_STATUS'

export class InquiryMutationError extends Error {
  constructor(
    public readonly code: InquiryMutationCode,
    message: string,
  ) {
    super(message)
    this.name = 'InquiryMutationError'
  }
}

interface RpcError {
  message: string
}

interface InquiryTransactionResult {
  inquiry: Inquiry
  messages: Message[]
}

interface InquiryRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: RpcError | null }>
}

function mapInquiryRpcError(error: RpcError, fallback: string): Error {
  if (error.message.includes('INKHUNT_ARTIST_NOT_FOUND')) {
    return new InquiryMutationError('ARTIST_NOT_FOUND', 'Artist not found')
  }
  if (error.message.includes('INKHUNT_ARTIST_NOT_ACTIVE')) {
    return new InquiryMutationError('ARTIST_NOT_ACTIVE', 'Artist is not accepting inquiries')
  }
  if (error.message.includes('INKHUNT_SELF_INQUIRY')) {
    return new InquiryMutationError('SELF_INQUIRY', 'Artists cannot inquire with themselves')
  }
  if (error.message.includes('INKHUNT_INQUIRY_NOT_FOUND')) {
    return new InquiryMutationError('INQUIRY_NOT_FOUND', 'Inquiry not found')
  }
  if (error.message.includes('INKHUNT_INQUIRY_FORBIDDEN')) {
    return new InquiryMutationError('INQUIRY_FORBIDDEN', 'Forbidden')
  }
  return new Error(`${fallback}: ${error.message}`)
}

const inquiryCreateSchema = z.object({
  artist_id: z.string().uuid(),
  description: z.string().min(10, '請至少描述 10 個字').max(1000),
  reference_images: z.array(
    z.string().refine(
      (value) => parseInquiryMediaPath(value) !== null,
      'Reference image must be a protected inquiry upload',
    ),
  ).max(3).default([]),
  body_part: z.string().min(1).optional(),
  size_estimate: z.string().min(1).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  // HAR-530: optional categorical budget. Accept only the 6 known codes; any
  // other value (or none) coerces to undefined → stored NULL. Never 400 — an
  // unknown budget code must not fail the whole inquiry submission.
  budget_range: z.enum(BUDGET_RANGES).optional().catch(() => undefined),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: 'budget_min must be <= budget_max', path: ['budget_min'] },
)

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>

export function validateInquiryCreate(input: unknown, ownerSupabaseId?: string) {
  const schema = ownerSupabaseId
    ? inquiryCreateSchema.superRefine((data, context) => {
      data.reference_images.forEach((value, index) => {
        if (!isOwnedInquiryMediaUrl(value, ownerSupabaseId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Reference image is not owned by the current user',
            path: ['reference_images', index],
          })
        }
      })
    })
    : inquiryCreateSchema

  return schema.safeParse(input)
}

export async function createInquiry(
  consumerLineId: string,
  consumerName: string | null,
  data: InquiryCreateInput,
): Promise<{ inquiry: Inquiry; messages: Message[] }> {
  const admin = createAdminClient()

  const summaryParts = [
    '新詢價',
    data.body_part ? `部位：${data.body_part}` : null,
    data.size_estimate ? `大小：${data.size_estimate}` : null,
    data.budget_min || data.budget_max
      ? `預算：NT$${data.budget_min ?? '?'} ~ NT$${data.budget_max ?? '?'}`
      : null,
    `\n${data.description}`,
  ].filter(Boolean).join('\n')

  const rpcClient = admin as unknown as InquiryRpcClient
  const { data: result, error } = await rpcClient.rpc('create_inquiry_transaction', {
    p_consumer_line_id: consumerLineId,
    p_consumer_name: consumerName,
    p_artist_id: data.artist_id,
    p_description: data.description,
    p_reference_images: data.reference_images,
    p_body_part: data.body_part ?? null,
    p_size_estimate: data.size_estimate ?? null,
    p_budget_min: data.budget_min ?? null,
    p_budget_max: data.budget_max ?? null,
    p_budget_range: data.budget_range ?? null,
    p_summary_content: summaryParts,
  })

  if (error) {
    throw mapInquiryRpcError(error, 'Failed to create inquiry')
  }

  if (!result || typeof result !== 'object' || !('inquiry' in result) || !('messages' in result)) {
    throw new Error('Failed to create inquiry: invalid transaction response')
  }

  return result as InquiryTransactionResult
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
  status?: InquiryStatus,
  page = 1,
  limit = 20,
): Promise<{ data: Inquiry[]; total: number }> {
  const supabase = await createServerClient()
  let query = supabase
    .from('inquiries')
    .select('*', { count: 'exact' })
    .eq('consumer_line_id', consumerLineId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
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
  callerLineUserId: string,
): Promise<Inquiry> {
  if (status !== 'closed') {
    throw new InquiryMutationError(
      'INVALID_INQUIRY_STATUS',
      'Only closing an inquiry is supported by this operation',
    )
  }

  const admin = createAdminClient()
  const rpcClient = admin as unknown as InquiryRpcClient
  const { data, error } = await rpcClient.rpc('close_inquiry_transaction', {
    p_inquiry_id: id,
    p_caller_line_id: callerLineUserId,
  })

  if (error) throw mapInquiryRpcError(error, 'Failed to update inquiry')
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error('Failed to update inquiry: invalid transaction response')
  }
  return data as Inquiry
}
