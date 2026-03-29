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

import { PATCH } from '../route'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

const mockRequireAdmin = vi.mocked(requireAdmin)
const mockHandleApiError = vi.mocked(handleApiError)
const mockCreateAdminClient = vi.mocked(createAdminClient)

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const INVALID_UUID = 'not-a-uuid'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Record<string, unknown> = { method }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never)
}

const mockAdmin = {
  supabaseId: 'admin-uuid',
  lineUserId: 'U_admin',
  displayName: 'Admin',
  avatarUrl: null,
}

describe('PATCH /api/admin/artists/[id]', () => {
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

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, { status: 'active' })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
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

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, { status: 'active' })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 400 when artist ID is not a valid UUID', async () => {
    mockRequireAdmin.mockResolvedValue(mockAdmin)

    const request = makeRequest('PATCH', `/api/admin/artists/${INVALID_UUID}`, { status: 'active' })
    const response = await PATCH(request, { params: Promise.resolve({ id: INVALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid artist ID')
  })

  it('returns 400 when request body fails validation', async () => {
    mockRequireAdmin.mockResolvedValue(mockAdmin)

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, {
      status: 'invalid-status',
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it('returns 404 when artist does not exist in database', async () => {
    mockRequireAdmin.mockResolvedValue(mockAdmin)

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) } as never)

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, { status: 'active' })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Artist not found')
  })

  it('returns 200 with updated artist when status update succeeds', async () => {
    mockRequireAdmin.mockResolvedValue(mockAdmin)

    const updatedArtist = {
      id: VALID_UUID,
      display_name: '測試刺青師',
      slug: 'test-artist',
      status: 'suspended',
      admin_note: '違反服務條款',
      city: '台北市',
    }

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedArtist, error: null }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) } as never)

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, {
      status: 'suspended',
      admin_note: '違反服務條款',
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe(VALID_UUID)
    expect(body.status).toBe('suspended')
    expect(body.admin_note).toBe('違反服務條款')
  })

  it('returns 200 with null admin_note when not provided', async () => {
    mockRequireAdmin.mockResolvedValue(mockAdmin)

    const updatedArtist = {
      id: VALID_UUID,
      status: 'active',
      admin_note: null,
    }

    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedArtist, error: null }),
    }
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) } as never)

    const request = makeRequest('PATCH', `/api/admin/artists/${VALID_UUID}`, { status: 'active' })
    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('active')
    expect(body.admin_note).toBeNull()
  })
})
