import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import type { Quote, Message, Json } from '@/types/database'

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

  const { data: quote, error: quoteError } = await admin
    .from('quotes')
    .insert({
      inquiry_id: inquiryId,
      artist_id: artistId,
      price: data.price,
      note: data.note ?? null,
      available_dates: data.available_dates?.join(', ') ?? null,
    })
    .select()
    .single()

  if (quoteError || !quote) {
    throw new Error(`Failed to create quote: ${quoteError?.message}`)
  }

  const { data: message, error: msgError } = await admin
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: 'artist' as const,
      sender_id: senderId,
      message_type: 'quote' as const,
      content: `報價 NT$${data.price.toLocaleString()}`,
      metadata: {
        quote_id: quote.id,
        price: data.price,
        note: data.note ?? null,
        available_dates: data.available_dates ?? null,
        status: 'sent',
      } as Json,
    })
    .select()
    .single()

  if (msgError || !message) {
    throw new Error(`Failed to create quote message: ${msgError?.message}`)
  }

  await admin
    .from('inquiries')
    .update({ status: 'quoted' })
    .eq('id', inquiryId)

  return { quote, message }
}

export async function respondToQuote(
  quoteId: string,
  inquiryId: string,
  status: 'accepted' | 'rejected',
): Promise<Quote> {
  const admin = createAdminClient()

  const { data: quote, error } = await admin
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)
    .select()
    .single()

  if (error || !quote) {
    throw new Error(`Failed to update quote: ${error?.message}`)
  }

  const statusText = status === 'accepted' ? '已接受報價' : '已拒絕報價'
  await admin.from('messages').insert({
    inquiry_id: inquiryId,
    sender_type: 'system' as const,
    sender_id: null,
    message_type: 'system' as const,
    content: statusText,
  })

  if (status === 'accepted') {
    await admin
      .from('inquiries')
      .update({ status: 'accepted' })
      .eq('id', inquiryId)
  }

  return quote
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
