import { createAdminClient } from '@/lib/supabase/server'
import { createInquiry } from '@/lib/supabase/queries/inquiries'
import type { QuoteRequestInput } from '@/lib/validations/quote-request'
import type { Inquiry, Quote } from '@/types/database'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Insert the quote_request record
  const { data: quoteRequest, error: qrError } = await admin
    .from('quote_requests')
    .insert({
      consumer_line_id: consumerLineId,
      consumer_name: consumerName,
      description: data.description,
      reference_images: data.reference_images,
      body_part: data.body_part,
      size_estimate: data.size_estimate,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
    })
    .select()
    .single()

  if (qrError || !quoteRequest) {
    throw new Error(`Failed to create quote request: ${qrError?.message}`)
  }

  const createdInquiries: Inquiry[] = []

  // Create one inquiry per artist, then link it back to the quote_request
  for (const artistId of data.artist_ids) {
    const { inquiry } = await createInquiry(consumerLineId, consumerName, {
      artist_id: artistId,
      description: data.description,
      reference_images: data.reference_images,
      body_part: data.body_part,
      size_estimate: data.size_estimate,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
    })

    const { error: linkError } = await admin
      .from('inquiries')
      .update({ quote_request_id: (quoteRequest as QuoteRequest).id })
      .eq('id', inquiry.id)

    if (linkError) {
      throw new Error(`Failed to link inquiry to quote request: ${linkError.message}`)
    }

    createdInquiries.push(inquiry)
  }

  return { quoteRequest: quoteRequest as QuoteRequest, inquiries: createdInquiries }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

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
