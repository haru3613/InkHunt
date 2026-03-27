import type { Artist, Style, PortfolioItem, Quote, Inquiry, Message } from './database'

// Artist list
export interface ArtistListItem {
  id: string
  slug: string
  display_name: string
  avatar_url: string | null
  city: string
  district: string | null
  price_min: number | null
  price_max: number | null
  featured: boolean
  styles: Style[]
  portfolio_preview: string[]
}

export interface ArtistListResponse {
  artists: ArtistListItem[]
  total: number
  page: number
  per_page: number
}

// Artist detail
export interface ArtistDetailResponse extends Artist {
  styles: Style[]
  portfolio_items: PortfolioItem[]
  review_summary: {
    count: number
    avg_skill: number
    avg_communication: number
    avg_environment: number
    avg_value: number
    avg_overall: number
  }
}

// Inquiry
export interface InquiryCreateRequest {
  artist_id: string
  description: string
  reference_images?: string[]
  body_part?: string
  size_estimate?: string
  budget_min?: number
  budget_max?: number
}

// Quote
export interface QuoteCreateRequest {
  price: number
  note?: string
  available_dates?: string
}

export interface QuoteResponse extends Quote {
  artist_display_name: string
}

// Chat / Messages
export interface InquiryListItem {
  id: string
  artist_id: string
  artist_slug: string
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_line_id: string
  consumer_name: string | null
  description: string
  body_part: string | null
  status: 'pending' | 'quoted' | 'accepted' | 'closed'
  last_message_content: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
}

export interface InquiryDetailResponse {
  inquiry: Inquiry
  artist: Pick<Artist, 'id' | 'slug' | 'display_name' | 'avatar_url'>
  messages: Message[]
}

// Error
export interface ApiError {
  error: string
  code?: string
  details?: Record<string, string>
}
