export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          id: string
          slug: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          ig_handle: string | null
          line_user_id: string | null
          city: string
          district: string | null
          address: string | null
          lat: number | null
          lng: number | null
          price_min: number | null
          price_max: number | null
          pricing_note: string | null
          deposit_amount: number | null
          booking_notice: string | null
          status: 'pending' | 'active' | 'suspended'
          is_claimed: boolean
          featured: boolean
          offers_coverup: boolean
          offers_custom_design: boolean
          has_flash_designs: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          ig_handle?: string | null
          line_user_id?: string | null
          city: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          price_min?: number | null
          price_max?: number | null
          pricing_note?: string | null
          deposit_amount?: number | null
          booking_notice?: string | null
          status?: 'pending' | 'active' | 'suspended'
          is_claimed?: boolean
          featured?: boolean
          offers_coverup?: boolean
          offers_custom_design?: boolean
          has_flash_designs?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          ig_handle?: string | null
          line_user_id?: string | null
          city?: string
          district?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          price_min?: number | null
          price_max?: number | null
          pricing_note?: string | null
          deposit_amount?: number | null
          booking_notice?: string | null
          status?: 'pending' | 'active' | 'suspended'
          is_claimed?: boolean
          featured?: boolean
          offers_coverup?: boolean
          offers_custom_design?: boolean
          has_flash_designs?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      styles: {
        Row: {
          id: number
          slug: string
          name: string
          icon: string | null
          name_en: string | null
          description: string | null
          subtitle: string | null
          group_name: string | null
          color_profile: string | null
          popularity: number
          sort_order: number
        }
        Insert: {
          id?: number
          slug: string
          name: string
          icon?: string | null
          name_en?: string | null
          description?: string | null
          subtitle?: string | null
          group_name?: string | null
          color_profile?: string | null
          popularity?: number
          sort_order?: number
        }
        Update: {
          id?: number
          slug?: string
          name?: string
          icon?: string | null
          name_en?: string | null
          description?: string | null
          subtitle?: string | null
          group_name?: string | null
          color_profile?: string | null
          popularity?: number
          sort_order?: number
        }
        Relationships: []
      }
      artist_styles: {
        Row: {
          artist_id: string
          style_id: number
        }
        Insert: {
          artist_id: string
          style_id: number
        }
        Update: {
          artist_id?: string
          style_id?: number
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          id: string
          artist_id: string
          image_url: string
          thumbnail_url: string | null
          title: string | null
          description: string | null
          body_part: string | null
          size_cm: string | null
          style_id: number | null
          healed_image_url: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          image_url: string
          thumbnail_url?: string | null
          title?: string | null
          description?: string | null
          body_part?: string | null
          size_cm?: string | null
          style_id?: number | null
          healed_image_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          image_url?: string
          thumbnail_url?: string | null
          title?: string | null
          description?: string | null
          body_part?: string | null
          size_cm?: string | null
          style_id?: number | null
          healed_image_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          artist_id: string
          consumer_line_id: string
          consumer_name: string | null
          description: string
          reference_images: Json
          body_part: string | null
          size_estimate: string | null
          budget_min: number | null
          budget_max: number | null
          status: 'pending' | 'quoted' | 'accepted' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          consumer_line_id: string
          consumer_name?: string | null
          description: string
          reference_images?: Json
          body_part?: string | null
          size_estimate?: string | null
          budget_min?: number | null
          budget_max?: number | null
          status?: 'pending' | 'quoted' | 'accepted' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          consumer_line_id?: string
          consumer_name?: string | null
          description?: string
          reference_images?: Json
          body_part?: string | null
          size_estimate?: string | null
          budget_min?: number | null
          budget_max?: number | null
          status?: 'pending' | 'quoted' | 'accepted' | 'closed'
          created_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          inquiry_id: string
          artist_id: string
          price: number
          note: string | null
          available_dates: string | null
          status: 'sent' | 'viewed' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          artist_id: string
          price: number
          note?: string | null
          available_dates?: string | null
          status?: 'sent' | 'viewed' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          artist_id?: string
          price?: number
          note?: string | null
          available_dates?: string | null
          status?: 'sent' | 'viewed' | 'accepted' | 'rejected'
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          artist_id: string
          consumer_line_id: string
          consumer_name: string | null
          rating_skill: number
          rating_communication: number
          rating_environment: number
          rating_value: number
          comment: string | null
          photo_urls: Json
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          consumer_line_id: string
          consumer_name?: string | null
          rating_skill: number
          rating_communication: number
          rating_environment: number
          rating_value: number
          comment?: string | null
          photo_urls?: Json
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          consumer_line_id?: string
          consumer_name?: string | null
          rating_skill?: number
          rating_communication?: number
          rating_environment?: number
          rating_value?: number
          comment?: string | null
          photo_urls?: Json
          verified?: boolean
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          consumer_line_id: string
          artist_id: string
          created_at: string
        }
        Insert: {
          consumer_line_id: string
          artist_id: string
          created_at?: string
        }
        Update: {
          consumer_line_id?: string
          artist_id?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          inquiry_id: string
          sender_type: 'consumer' | 'artist' | 'system'
          sender_id: string | null
          message_type: 'text' | 'image' | 'quote' | 'system'
          content: string | null
          metadata: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          sender_type: 'consumer' | 'artist' | 'system'
          sender_id?: string | null
          message_type: 'text' | 'image' | 'quote' | 'system'
          content?: string | null
          metadata?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          sender_type?: 'consumer' | 'artist' | 'system'
          sender_id?: string | null
          message_type?: 'text' | 'image' | 'quote' | 'system'
          content?: string | null
          metadata?: Json
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience aliases
export type Artist = Database['public']['Tables']['artists']['Row']
export type ArtistInsert = Database['public']['Tables']['artists']['Insert']
export type ArtistUpdate = Database['public']['Tables']['artists']['Update']

export type Style = Database['public']['Tables']['styles']['Row']

export type ArtistStyle = Database['public']['Tables']['artist_styles']['Row']

export type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row']
export type PortfolioItemInsert = Database['public']['Tables']['portfolio_items']['Insert']

export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type InquiryInsert = Database['public']['Tables']['inquiries']['Insert']

export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']

export type Review = Database['public']['Tables']['reviews']['Row']

export type Favorite = Database['public']['Tables']['favorites']['Row']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
