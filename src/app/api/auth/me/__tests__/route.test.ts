import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies BEFORE imports of the module under test
vi.mock('@/lib/auth/helpers', () => ({
  getCurrentUser: vi.fn(),
  getArtistForUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { GET } from '../route'
import { getCurrentUser, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient } from '@/lib/supabase/server'

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockCreateServerClient = vi.mocked(createServerClient)

const mockAuthUser = {
  supabaseId: 'supabase-uuid-123',
  lineUserId: 'U_line_user_abc',
  displayName: '林小美',
  avatarUrl: 'https://example.com/avatar.jpg',
}

const mockArtist = {
  id: 'artist-uuid-456',
  slug: 'lin-xiao-mei',
  display_name: '林小美刺青',
  status: 'active' as const,
  line_user_id: 'U_line_user_abc',
  price_min: 3000,
  price_max: 20000,
  pricing_note: null,
  deposit_amount: null,
  booking_notice: null,
  city: '台北市',
  district: null,
  address: null,
  lat: null,
  lng: null,
  bio: '專業刺青師',
  ig_handle: 'lin_tattoo',
  avatar_url: null,
  admin_note: null,
  is_claimed: true,
  featured: false,
  offers_coverup: false,
  offers_custom_design: false,
  has_flash_designs: false,
  quote_templates: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null user and null artist when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user).toBeNull()
    expect(body.artist).toBeNull()
    // getArtistForUser should not be called when no user
    expect(mockGetArtistForUser).not.toHaveBeenCalled()
  })

  it('returns user with null artist when user has no artist profile', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAuthUser)
    mockGetArtistForUser.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user).toEqual({
      lineUserId: 'U_line_user_abc',
      displayName: '林小美',
      avatarUrl: 'https://example.com/avatar.jpg',
    })
    expect(body.artist).toBeNull()
    expect(mockGetArtistForUser).toHaveBeenCalledWith('U_line_user_abc')
  })

  it('returns user with artist profile including portfolio count', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAuthUser)
    mockGetArtistForUser.mockResolvedValue(mockArtist)

    const mockCountQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 12, error: null }),
    }
    mockCreateServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockCountQuery),
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user.lineUserId).toBe('U_line_user_abc')
    expect(body.artist).toEqual({
      id: 'artist-uuid-456',
      slug: 'lin-xiao-mei',
      display_name: '林小美刺青',
      status: 'active',
      price_min: 3000,
      portfolio_count: 12,
    })
  })

  it('returns portfolio_count of 0 when count query returns null', async () => {
    mockGetCurrentUser.mockResolvedValue(mockAuthUser)
    mockGetArtistForUser.mockResolvedValue(mockArtist)

    const mockCountQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: null, error: null }),
    }
    mockCreateServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockCountQuery),
    } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.artist.portfolio_count).toBe(0)
  })
})
