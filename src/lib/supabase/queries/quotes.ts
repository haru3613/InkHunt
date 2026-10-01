import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import type { Quote, Message } from '@/types/database'

export type QuoteMutationCode =
  | 'ARTIST_NOT_ACTIVE'
  | 'INQUIRY_NOT_FOUND'
  | 'INQUIRY_NOT_OPEN'
  | 'QUOTE_FORBIDDEN'
  | 'QUOTE_NOT_ACTIONABLE'

export class QuoteMutationError extends Error {
  constructor(
    public readonly code: QuoteMutationCode,
    message: string,
  ) {
    super(message)
    this.name = 'QuoteMutationError'
  }
}

interface RpcError {
  message: string
}

interface QuoteTransactionResult {
  quote: Quote
  message: Message
}

interface QuoteRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: RpcError | null }>
}

function mapQuoteRpcError(error: RpcError, fallback: string): Error {
  if (error.message.includes('INKHUNT_ARTIST_NOT_ACTIVE')) {
    return new QuoteMutationError('ARTIST_NOT_ACTIVE', 'Artist is not active')
  }
  if (error.message.includes('INKHUNT_INQUIRY_NOT_FOUND')) {
    return new QuoteMutationError('INQUIRY_NOT_FOUND', 'Inquiry not found')
  }
  if (error.message.includes('INKHUNT_INQUIRY_NOT_OPEN')) {
    return new QuoteMutationError('INQUIRY_NOT_OPEN', 'Inquiry is no longer open')
  }
  if (error.message.includes('INKHUNT_QUOTE_FORBIDDEN')) {
    return new QuoteMutationError('QUOTE_FORBIDDEN', 'Forbidden')
  }
  if (error.message.includes('INKHUNT_QUOTE_NOT_ACTIONABLE')) {
    return new QuoteMutationError('QUOTE_NOT_ACTIONABLE', 'Quote is no longer actionable')
  }
  return new Error(`${fallback}: ${error.message}`)
}

const quoteCreateSchema = z.object({
  price: z.number().int().min(1, 'Price must be positive'),
  note: z.string().max(500).optional(),
  available_dates: z.array(z.string()).max(10).optional(),
})

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>

export function validateQuoteCreate(input: unknown) {
  return quoteCreateSchema.safeParse(input)
}

export async function createQuote(
  inquiryId: string,
  artistId: string,
  senderId: string,
  data: QuoteCreateInput,
): Promise<{ quote: Quote; message: Message }> {
  const admin = createAdminClient()
  const rpcClient = admin as unknown as QuoteRpcClient
  const { data: result, error } = await rpcClient.rpc('create_quote_transaction', {
    p_inquiry_id: inquiryId,
    p_artist_id: artistId,
    p_sender_line_id: senderId,
    p_price: data.price,
    p_note: data.note ?? null,
    p_available_dates: data.available_dates?.join(', ') ?? null,
    p_available_dates_json: data.available_dates ?? null,
    p_message_content: `報價 NT$${data.price.toLocaleString()}`,
  })

  if (error) throw mapQuoteRpcError(error, 'Failed to create quote')
  if (!result || typeof result !== 'object' || !('quote' in result) || !('message' in result)) {
    throw new Error('Failed to create quote: invalid transaction response')
  }

  return result as QuoteTransactionResult
}

export async function respondToQuote(
  quoteId: string,
  inquiryId: string,
  status: 'accepted' | 'rejected',
  consumerLineId: string,
): Promise<Quote | null> {
  const admin = createAdminClient()
  const rpcClient = admin as unknown as QuoteRpcClient
  const { data: quote, error } = await rpcClient.rpc('respond_to_quote_transaction', {
    p_quote_id: quoteId,
    p_inquiry_id: inquiryId,
    p_consumer_line_id: consumerLineId,
    p_status: status,
  })

  if (error) throw mapQuoteRpcError(error, 'Failed to update quote')
  if (quote === null) return null
  if (typeof quote !== 'object' || !('id' in quote)) {
    throw new Error('Failed to update quote: invalid transaction response')
  }
  return quote as Quote
}

export async function markQuoteViewed(quoteId: string, inquiryId: string) {
  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes')
    .update({ status: 'viewed' })
    .eq('id', quoteId)
    .eq('inquiry_id', inquiryId)
    .eq('status', 'sent')
    .select()
    .maybeSingle()
  return quote
}
