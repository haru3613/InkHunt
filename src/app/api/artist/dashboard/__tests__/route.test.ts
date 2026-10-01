import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  getArtistForUser: vi.fn(),
  handleApiError: vi.fn((error: unknown) => new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'error' }), { status: error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500 })),
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn(() => ({})) }))
vi.mock('@/lib/artist-dashboard/data', () => ({ getArtistDashboardData: vi.fn() }))

import { GET } from '../route'
import { getArtistForUser, requireAuth } from '@/lib/auth/helpers'
import { getArtistDashboardData } from '@/lib/artist-dashboard/data'

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`)
const user = { lineUserId: 'artist-line', supabaseId: 'supabase-id', displayName: 'artist', avatarUrl: null }

describe('GET /api/artist/dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects impossible dates before querying the dashboard', async () => {
    const response = await GET(request('/api/artist/dashboard?date=2026-02-29&period=7'))
    expect(response.status).toBe(400)
    expect(requireAuth).not.toHaveBeenCalled()
  })

  it('requires an authenticated artist and does not accept an artist_id parameter', async () => {
    vi.mocked(requireAuth).mockResolvedValue(user)
    vi.mocked(getArtistForUser).mockResolvedValue({ id: 'owned-artist' } as never)
    vi.mocked(getArtistDashboardData).mockResolvedValue({ today: '2026-04-08' } as never)
    const response = await GET(request('/api/artist/dashboard?date=2026-04-08&period=30&artist_id=other-artist'))
    expect(response.status).toBe(200)
    expect(getArtistDashboardData).toHaveBeenCalledWith(expect.anything(), 'owned-artist', 'artist-line', '2026-04-08', 30)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('returns 401 for an unauthenticated request and 404 without an artist profile', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('UNAUTHORIZED'))
    expect((await GET(request('/api/artist/dashboard'))).status).toBe(401)
    vi.mocked(requireAuth).mockResolvedValueOnce(user)
    vi.mocked(getArtistForUser).mockResolvedValueOnce(null)
    expect((await GET(request('/api/artist/dashboard'))).status).toBe(404)
  })

  it('does not turn a database failure into zero metrics', async () => {
    vi.mocked(requireAuth).mockResolvedValue(user)
    vi.mocked(getArtistForUser).mockResolvedValue({ id: 'owned-artist' } as never)
    vi.mocked(getArtistDashboardData).mockRejectedValue(new Error('Failed to fetch inquiries: database unavailable'))
    const response = await GET(request('/api/artist/dashboard?date=2026-04-08'))
    expect(response.status).toBe(500)
    expect(getArtistDashboardData).toHaveBeenCalled()
  })
})
