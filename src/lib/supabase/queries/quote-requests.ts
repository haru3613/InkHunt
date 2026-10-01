import { createAdminClient } from '@/lib/supabase/server'
import type { QuoteRequestInput } from '@/lib/validations/quote-request'
import type { Inquiry, Quote } from '@/types/database'

interface RpcError {
  message: string
}

interface QuoteRequestRpcClient {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: RpcError | null }>
}

// Convenience alias with a narrower status union
export interface QuoteRequest {
  id: string
  consumer_line_id: string
  consumer_name: string | null
  description: string
  reference_images: string[]
  body_part: string | null
  size_estimate: string | null
  budget_min: number | null
  budget_max: number | null
  status: 'pending' | 'quoting' | 'quoted' | 'accepted' | 'closed'
  created_at: string
}

export interface QuoteRequestResult {
  quoteRequest: QuoteRequest
  inquiries: Inquiry[]
}

export async function createQuoteRequest(
  consumerLineId: string,
  consumerName: string | null,
  data: QuoteRequestInput,
): Promise<QuoteRequestResult> {
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

  const rpcClient = admin as unknown as QuoteRequestRpcClient
  const { data: result, error } = await rpcClient.rpc('create_quote_request_transaction', {
    p_consumer_line_id: consumerLineId,
    p_consumer_name: consumerName,
    p_artist_ids: data.artist_ids,
    p_description: data.description,
    p_reference_images: data.reference_images,
    p_body_part: data.body_part,
    p_size_estimate: data.size_estimate,
    p_budget_min: data.budget_min ?? null,
    p_budget_max: data.budget_max ?? null,
    p_summary_content: summaryParts,
  })

  if (error) {
    throw new Error(`Failed to create quote request: ${error.message}`)
  }
  if (
    !result
    || typeof result !== 'object'
    || !('quoteRequest' in result)
    || !('inquiries' in result)
  ) {
    throw new Error('Failed to create quote request: invalid transaction response')
  }

  return result as QuoteRequestResult
}

export interface InquiryWithDetails extends Inquiry {
  artist: {
    id: string
    slug: string
    display_name: string
    avatar_url: string | null
    city: string
  } | null
  quotes: Quote[]
}

export interface QuoteRequestWithQuotes {
  quoteRequest: QuoteRequest
  inquiries: InquiryWithDetails[]
}

export async function getQuoteRequestWithQuotes(
  id: string,
): Promise<QuoteRequestWithQuotes | null> {
  const admin = createAdminClient()

  const { data: quoteRequest, error: qrError } = await admin
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (qrError || !quoteRequest) {
    return null
  }

  const { data: inquiries, error: inqError } = await admin
    .from('inquiries')
    .select('*, artist:artists(id, slug, display_name, avatar_url, city), quotes(*)')
    .eq('quote_request_id', id)

  if (inqError) {
    throw new Error(`Failed to fetch inquiries for quote request: ${inqError.message}`)
  }

  return {
    quoteRequest: quoteRequest as QuoteRequest,
    inquiries: (inquiries ?? []) as unknown as InquiryWithDetails[],
  }
}
