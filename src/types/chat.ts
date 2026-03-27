import type { Message, Inquiry, Artist } from './database'

export interface ChatConversation {
  inquiry: Inquiry
  artist: Pick<Artist, 'id' | 'slug' | 'display_name' | 'avatar_url'>
  last_message: Message | null
  unread_count: number
}

export interface ChatConversationList {
  conversations: ChatConversation[]
  total: number
}

export interface QuoteMetadata {
  quote_id: string
  price: number
  note: string | null
  available_dates: string[] | null
  status: 'sent' | 'viewed' | 'accepted' | 'rejected'
}

export interface SendMessageRequest {
  message_type: 'text' | 'image'
  content: string
}

export interface SendQuoteRequest {
  price: number
  note?: string
  available_dates?: string[]
}

export interface SignedUrlRequest {
  bucket: 'portfolio' | 'inquiries'
  filename: string
  content_type: string
}

export interface SignedUrlResponse {
  signed_url: string
  public_url: string
  path: string
}
