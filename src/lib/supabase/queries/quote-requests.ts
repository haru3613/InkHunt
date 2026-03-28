import { createAdminClient } from '@/lib/supabase/server'
import { createInquiry } from '@/lib/supabase/queries/inquiries'
import type { QuoteRequestInput } from '@/lib/validations/quote-request'
import type { Inquiry, Quote } from '@/types/database'

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

  // Create one inquiry per artist in parallel, then link each back to the quote_request
  const results = await Promise.all(
    data.artist_ids.map(async (artistId) => {
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
        .update({ quote_request_id: quoteRequest.id })
        .eq('id', inquiry.id)

      if (linkError) {
        throw new Error(`Failed to link inquiry to quote request: ${linkError.message}`)
      }

      return inquiry
    }),
  )

  return { quoteRequest: quoteRequest as QuoteRequest, inquiries: results }
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
