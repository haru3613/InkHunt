import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies BEFORE imports of the module under test
vi.mock('@/lib/auth/helpers', () => ({
  requireAdmin: vi.fn(),
  handleApiError: vi.fn((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/transforms', () => ({
  flattenArtistStyles: vi.fn((artistStyles: Array<{ styles: unknown }> | null) =>
    (artistStyles ?? []).map((as) => as.styles),
  ),
}))

import { GET } from '../route'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockHandleApiError = vi.mocked(handleApiError)
const mockCreateAdminClient = vi.mocked(createAdminClient)

function makeRequest(method: string, url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method })
}

describe('GET /api/admin/artists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('UNAUTHORIZED'))
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(mockHandleApiError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns 403 when user is authenticated but not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('FORBIDDEN'))
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with all artists including styles on success', async () => {
    const mockArtists = [
      {
        id: 'artist-uuid-1',
        display_name: '測試刺青師甲',
        slug: 'test-artist-a',
        status: 'active',
        city: '台北市',
        created_at: '2025-01-01T00:00:00Z',
        artist_styles: [
          { style_id: 's1', styles: { id: 's1', name: '極簡線條', slug: 'fine-line' } },
        ],
      },
      {
        id: 'artist-uuid-2',
        display_name: '測試刺青師乙',
        slug: 'test-artist-b',
        status: 'suspended',
        city: '高雄市',
        created_at: '2025-02-01T00:00:00Z',
        artist_styles: [],
      },
    ]

    mockRequireAdmin.mockResolvedValue({
      supabaseId: 'admin-uuid',
      lineUserId: 'U_admin',
      displayName: 'Admin',
      avatarUrl: null,
    })

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockArtists, error: null }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(mockQuery) } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(2)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].display_name).toBe('測試刺青師甲')
    // artist_styles should be removed, replaced by styles
    expect(body.data[0].artist_styles).toBeUndefined()
    expect(body.data[0].styles).toHaveLength(1)
    expect(body.data[0].styles[0].name).toBe('極簡線條')
  })

  it('returns 500 when database query fails', async () => {
    mockRequireAdmin.mockResolvedValue({
      supabaseId: 'admin-uuid',
      lineUserId: 'U_admin',
      displayName: 'Admin',
      avatarUrl: null,
    })

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(mockQuery) } as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to load artists')
  })
})
