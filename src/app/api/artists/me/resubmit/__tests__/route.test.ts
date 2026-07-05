import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(),
  handleApiError: vi.fn((err: unknown) => {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
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

import { POST } from '../route'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

const mockRequireAuth = vi.mocked(requireAuth)
const mockHandleApiError = vi.mocked(handleApiError)
const mockCreateAdminClient = vi.mocked(createAdminClient)

const mockUser = {
  supabaseId: 'user-uuid',
  lineUserId: 'U_artist',
  displayName: 'Artist',
  avatarUrl: null,
}

function mockArtistLookup(artist: unknown, updated: unknown) {
  const selectSingle = vi.fn().mockResolvedValue({ data: artist, error: artist ? null : { message: 'Not found' } })
  const updateSingle = vi.fn().mockResolvedValue({ data: updated, error: updated ? null : { message: 'Not found' } })
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: selectSingle,
  }
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: updateSingle,
  }
  const from = vi.fn()
    .mockReturnValueOnce(selectChain)
    .mockReturnValueOnce(updateChain)

  mockCreateAdminClient.mockReturnValue({ from } as never)
  return { from, selectChain, updateChain }
}

describe('POST /api/artists/me/resubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the artist is not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))
    mockHandleApiError.mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    )

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when the signed-in user has no artist profile', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockArtistLookup(null, null)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Artist not found')
  })

  it('returns 409 when the artist is not currently rejected', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    mockArtistLookup({ id: 'artist-1', status: 'active' }, null)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('Artist is not rejected')
  })

  it('moves the signed-in rejected artist back to pending review', async () => {
    mockRequireAuth.mockResolvedValue(mockUser)
    const { selectChain, updateChain } = mockArtistLookup(
      { id: 'artist-1', status: 'suspended' },
      { id: 'artist-1', status: 'pending', admin_note: null },
    )

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('pending')
    expect(selectChain.eq).toHaveBeenCalledWith('line_user_id', 'U_artist')
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'pending', admin_note: null })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'artist-1')
    expect(updateChain.eq).toHaveBeenCalledWith('status', 'suspended')
  })
})
