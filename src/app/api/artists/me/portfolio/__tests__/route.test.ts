import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  getArtistForUser: vi.fn(),
  handleApiError: vi.fn().mockImplementation(() =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

import { GET } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockCreateAdminClient = vi.mocked(createAdminClient)

describe('GET /api/artists/me/portfolio', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the authenticated artist portfolio regardless of public approval status', async () => {
    mockRequireAuth.mockResolvedValue({ lineUserId: 'line-1' } as never)
    mockGetArtistForUser.mockResolvedValue({
      id: 'artist-1',
      slug: 'pending-artist',
      status: 'pending',
    } as never)
    const items = [{ id: 'work-1', artist_id: 'artist-1', sort_order: 0 }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: items, error: null }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as never)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(items)
    expect(chain.eq).toHaveBeenCalledWith('artist_id', 'artist-1')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('returns 404 when the authenticated user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValue({ lineUserId: 'line-1' } as never)
    mockGetArtistForUser.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(404)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('does not expose another artist portfolio when the query fails', async () => {
    mockRequireAuth.mockResolvedValue({ lineUserId: 'line-1' } as never)
    mockGetArtistForUser.mockResolvedValue({ id: 'artist-1' } as never)
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as never)

    const response = await GET()

    expect(response.status).toBe(500)
  })
})
