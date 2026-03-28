import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

import { transformArtistRow, getArtistBySlug, getFeaturedArtists, getArtists } from '../artists'

describe('transformArtistRow', () => {
  it('flattens artist_styles into styles array', () => {
    const row = {
      id: 'a1',
      slug: 'test-artist',
      display_name: 'Test',
      bio: null,
      avatar_url: null,
      ig_handle: null,
      line_user_id: null,
      city: '台北市',
      district: null,
      address: null,
      lat: null,
      lng: null,
      price_min: 3000,
      price_max: 10000,
      pricing_note: null,
      deposit_amount: null,
      booking_notice: null,
      admin_note: null,
      status: 'active' as const,
      is_claimed: true,
      offers_coverup: false,
      offers_custom_design: true,
      has_flash_designs: false,
      featured: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      artist_styles: [
        { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
        { styles: { id: 2, slug: 'micro', name: '微刺青', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 2 } },
      ],
      portfolio_items: [
        { id: 'p2', artist_id: 'a1', image_url: '/2.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
        { id: 'p1', artist_id: 'a1', image_url: '/1.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
      ],
    }

    const result = transformArtistRow(row)

    expect(result.styles).toHaveLength(2)
    expect(result.styles[0].slug).toBe('fine-line')
    expect(result.styles[1].slug).toBe('micro')
    expect(result.portfolio_items[0].sort_order).toBe(1)
    expect(result.portfolio_items[1].sort_order).toBe(2)
    expect(result).not.toHaveProperty('artist_styles')
  })

  it('handles empty artist_styles', () => {
    const row = {
      id: 'a1',
      slug: 'test',
      display_name: 'Test',
      bio: null,
      avatar_url: null,
      ig_handle: null,
      line_user_id: null,
      city: '台北市',
      district: null,
      address: null,
      lat: null,
      lng: null,
      price_min: null,
      price_max: null,
      pricing_note: null,
      deposit_amount: null,
      booking_notice: null,
      admin_note: null,
      status: 'active' as const,
      is_claimed: false,
      offers_coverup: false,
      offers_custom_design: false,
      has_flash_designs: false,
      featured: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      artist_styles: [],
      portfolio_items: [],
    }

    const result = transformArtistRow(row)

    expect(result.styles).toEqual([])
    expect(result.portfolio_items).toEqual([])
  })
})

describe('getArtistBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns transformed artist when found', async () => {
    const raw = {
      id: 'a1',
      slug: 'test-artist',
      display_name: 'Test',
      bio: null,
      avatar_url: null,
      ig_handle: null,
      line_user_id: null,
      city: '台北市',
      district: null,
      address: null,
      lat: null,
      lng: null,
      price_min: 3000,
      price_max: 10000,
      pricing_note: null,
      deposit_amount: null,
      booking_notice: null,
      admin_note: null,
      status: 'active',
      is_claimed: true,
      offers_coverup: false,
      offers_custom_design: true,
      has_flash_designs: false,
      featured: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      artist_styles: [
        { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
      ],
      portfolio_items: [],
    }

    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: raw, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getArtistBySlug('test-artist')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('test-artist')
    expect(result?.styles).toHaveLength(1)
  })

  it('returns null when not found', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    const result = await getArtistBySlug('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getFeaturedArtists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns transformed featured artists', async () => {
    const raw = [
      {
        id: 'a1',
        slug: 'featured-1',
        display_name: 'Featured',
        bio: null,
        avatar_url: null,
        ig_handle: null,
        line_user_id: null,
        city: '台北市',
        district: null,
        address: null,
        lat: null,
        lng: null,
        price_min: null,
        price_max: null,
        pricing_note: null,
        deposit_amount: null,
        booking_notice: null,
        admin_note: null,
        status: 'active',
        is_claimed: true,
        offers_coverup: false,
        offers_custom_design: false,
        has_flash_designs: false,
        featured: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        artist_styles: [],
        portfolio_items: [],
      },
    ]

    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockResolvedValue({ data: raw, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getFeaturedArtists(3)

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('featured-1')
    expect(chain.limit).toHaveBeenCalledWith(3)
  })

  it('returns empty array on error', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })
    mockFrom.mockReturnValue(chain)

    const result = await getFeaturedArtists()

    expect(result).toEqual([])
  })
})

describe('getArtists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated artists without filters', async () => {
    const raw = [
      {
        id: 'a1',
        slug: 'artist-1',
        display_name: 'Artist 1',
        bio: null,
        avatar_url: null,
        ig_handle: null,
        line_user_id: null,
        city: '台北市',
        district: null,
        address: null,
        lat: null,
        lng: null,
        price_min: null,
        price_max: null,
        pricing_note: null,
        deposit_amount: null,
        booking_notice: null,
        admin_note: null,
        status: 'active',
        is_claimed: true,
        offers_coverup: false,
        offers_custom_design: false,
        has_flash_designs: false,
        featured: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        artist_styles: [],
        portfolio_items: [],
      },
    ]

    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        // count query
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockResolvedValue({ count: 1, error: null })
        return chain
      }
      // data query
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.range = vi.fn().mockReturnValue(chain)
      chain.in = vi.fn().mockReturnValue(chain)
      // Final resolution
      ;(chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({ data: raw, error: null })
      return chain
    })

    const result = await getArtists({ page: 1, pageSize: 12 })

    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].slug).toBe('artist-1')
  })

  it('returns empty result when no artists match style filter', async () => {
    let callNum = 0
    mockFrom.mockImplementation((table: string) => {
      callNum++
      if (table === 'styles') {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue({ data: { id: 99 }, error: null })
        return chain
      }
      if (table === 'artist_styles') {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockResolvedValue({ data: [], error: null })
        return chain
      }
      return { select: vi.fn() }
    })

    const result = await getArtists({ style: 'nonexistent-style' })

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})
