import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth BEFORE importing route handlers
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  getArtistForUser: vi.fn(),
  handleApiError: vi.fn().mockImplementation((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/upload/storage', () => ({
  deletePortfolioStorageObjects: vi.fn().mockResolvedValue(undefined),
}))

import { DELETE } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { deletePortfolioStorageObjects } from '@/lib/upload/storage'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockCreateAdminClient = vi.mocked(createAdminClient)
const mockDeletePortfolioStorageObjects = vi.mocked(deletePortfolioStorageObjects)

const MOCK_USER = {
  supabaseId: 'supabase-uuid-artist',
  lineUserId: 'Uartist123',
  displayName: '測試刺青師',
  avatarUrl: null,
}

const MOCK_ARTIST = {
  id: 'artist-uuid-1',
  slug: 'test-artist',
  display_name: '測試刺青師',
  line_user_id: 'Uartist123',
}

const MOCK_ITEM = {
  id: 'item-uuid-1',
  image_url: 'https://xyz.supabase.co/storage/v1/object/public/portfolio/artist-uuid-1/1.jpg',
  thumbnail_url: null,
  healed_image_url: null,
}

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'DELETE' } as never)
}

function makeParams(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) }
}

// Build a chainable Supabase query builder mock for the select().eq().eq().single() lookup
function makeQueryBuilder(singleResult: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  }
}

describe('DELETE /api/artists/[slug]/portfolio/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when the authenticated user does not own the artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce({
      ...MOCK_ARTIST,
      slug: 'different-artist',
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when the user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(null)

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(403)
  })

  it('returns 404 when the item does not exist or is not owned by the artist', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const fetchChain = makeQueryBuilder({ data: null, error: null })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(fetchChain),
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/missing-item')
    const res = await DELETE(req, makeParams('test-artist', 'missing-item'))

    expect(res.status).toBe(404)
    expect(mockDeletePortfolioStorageObjects).not.toHaveBeenCalled()
  })

  it('deletes the row and the storage objects, returning 200', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const fetchChain = makeQueryBuilder({ data: MOCK_ITEM, error: null })
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    // last .eq() call resolves the delete promise
    let deleteEqCalls = 0
    deleteChain.eq = vi.fn().mockImplementation(() => {
      deleteEqCalls += 1
      if (deleteEqCalls === 2) return Promise.resolve({ error: null })
      return deleteChain
    })

    const fromMock = vi.fn()
      .mockReturnValueOnce(fetchChain) // select for ownership/existence check
      .mockReturnValueOnce(deleteChain) // delete call

    mockCreateAdminClient.mockReturnValue({
      from: fromMock,
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(200)
    expect(mockDeletePortfolioStorageObjects).toHaveBeenCalledWith(
      expect.anything(),
      [MOCK_ITEM.image_url, MOCK_ITEM.thumbnail_url, MOCK_ITEM.healed_image_url],
    )
  })
})
