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

vi.mock('@/lib/cache/revalidate-artist', () => ({
  revalidateArtistPage: vi.fn(),
}))

import { DELETE, PATCH } from '../route'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { deletePortfolioStorageObjects } from '@/lib/upload/storage'
import { revalidateArtistPage } from '@/lib/cache/revalidate-artist'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetArtistForUser = vi.mocked(getArtistForUser)
const mockCreateAdminClient = vi.mocked(createAdminClient)
const mockDeletePortfolioStorageObjects = vi.mocked(deletePortfolioStorageObjects)
const mockRevalidateArtistPage = vi.mocked(revalidateArtistPage)

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

function makePatchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(slug: string, id: string) {
  return { params: Promise.resolve({ slug, id }) }
}

// Build a chainable Supabase query builder mock for delete().eq().eq().select().single()
function makeDeleteChain(singleResult: { data: unknown; error: unknown }) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  }
}

function makeUpdateChain(singleResult: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  }
}

describe('PATCH /api/artists/[slug]/portfolio/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unknown or ownership fields', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)

    const res = await PATCH(
      makePatchRequest('/api/artists/test-artist/portfolio/item-uuid-1', {
        title: '作品',
        artist_id: 'another-artist',
      }),
      makeParams('test-artist', 'item-uuid-1'),
    )

    expect(res.status).toBe(400)
    expect(mockGetArtistForUser).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns 403 when the authenticated user does not own the slug', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce({ ...MOCK_ARTIST, slug: 'someone-else' } as never)

    const res = await PATCH(
      makePatchRequest('/api/artists/test-artist/portfolio/item-uuid-1', { title: '作品' }),
      makeParams('test-artist', 'item-uuid-1'),
    )

    expect(res.status).toBe(403)
  })

  it('updates only the row matching both item id and owner artist id', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    const updated = {
      ...MOCK_ITEM,
      artist_id: MOCK_ARTIST.id,
      title: '牡丹與錦鯉',
      description: '牡丹 錦鯉 日式傳統',
      style_id: 2,
      body_part: '前臂',
      size_cm: '15 x 8 cm',
    }
    const updateChain = makeUpdateChain({ data: updated, error: null })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(updateChain),
    } as never)

    const payload = {
      title: '牡丹與錦鯉',
      description: '牡丹 錦鯉 日式傳統',
      style_id: 2,
      body_part: '前臂',
      size_cm: '15 x 8 cm',
      healed_image_url: null,
    }
    const res = await PATCH(
      makePatchRequest('/api/artists/test-artist/portfolio/item-uuid-1', payload),
      makeParams('test-artist', 'item-uuid-1'),
    )

    expect(res.status).toBe(200)
    expect(updateChain.update).toHaveBeenCalledWith(payload)
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'item-uuid-1')
    expect(updateChain.eq).toHaveBeenCalledWith('artist_id', MOCK_ARTIST.id)
    expect(mockRevalidateArtistPage).toHaveBeenCalledWith('test-artist')
  })

  it('returns 404 and does not revalidate when the owned row is absent', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)
    const updateChain = makeUpdateChain({ data: null, error: { message: 'no rows' } })
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(updateChain) } as never)

    const res = await PATCH(
      makePatchRequest('/api/artists/test-artist/portfolio/missing', { title: '作品' }),
      makeParams('test-artist', 'missing'),
    )

    expect(res.status).toBe(404)
    expect(mockRevalidateArtistPage).not.toHaveBeenCalled()
  })
})

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

    const deleteChain = makeDeleteChain({ data: null, error: { message: 'no rows' } })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteChain),
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/missing-item')
    const res = await DELETE(req, makeParams('test-artist', 'missing-item'))

    expect(res.status).toBe(404)
    expect(mockDeletePortfolioStorageObjects).not.toHaveBeenCalled()
  })

  it('deletes the row and the storage objects, returning 200', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const deleteChain = makeDeleteChain({ data: MOCK_ITEM, error: null })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteChain),
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(200)
    expect(mockDeletePortfolioStorageObjects).toHaveBeenCalledWith(
      expect.anything(),
      [MOCK_ITEM.image_url, MOCK_ITEM.thumbnail_url, MOCK_ITEM.healed_image_url],
    )
  })

  // HAR-664: deleting a portfolio item must revalidate the public slug page
  // so the change is visible without waiting for the next deploy.
  it('revalidates the public artist page after a successful delete', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const deleteChain = makeDeleteChain({ data: MOCK_ITEM, error: null })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteChain),
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/item-uuid-1')
    const res = await DELETE(req, makeParams('test-artist', 'item-uuid-1'))

    expect(res.status).toBe(200)
    expect(mockRevalidateArtistPage).toHaveBeenCalledWith('test-artist')
  })

  it('does not revalidate when the item is not found', async () => {
    mockRequireAuth.mockResolvedValueOnce(MOCK_USER)
    mockGetArtistForUser.mockResolvedValueOnce(MOCK_ARTIST as never)

    const deleteChain = makeDeleteChain({ data: null, error: { message: 'no rows' } })
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(deleteChain),
    } as never)

    const req = makeRequest('/api/artists/test-artist/portfolio/missing-item')
    const res = await DELETE(req, makeParams('test-artist', 'missing-item'))

    expect(res.status).toBe(404)
    expect(mockRevalidateArtistPage).not.toHaveBeenCalled()
  })
})
