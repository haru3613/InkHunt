import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetSession = vi.fn()
const mockClient = {
  auth: { getSession: mockGetSession },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => mockClient),
}))

import {
  extractUserFromSession,
  isAdmin,
  getCurrentUser,
  requireAuth,
  requireAdmin,
  handleApiError,
  getArtistForUser,
  authorizeInquiryAccess,
} from '../helpers'

function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

describe('extractUserFromSession', () => {
  it('returns null when no session', () => {
    const result = extractUserFromSession(null)
    expect(result).toBeNull()
  })

  it('returns null when session has no user', () => {
    const result = extractUserFromSession({ user: null } as never)
    expect(result).toBeNull()
  })

  it('extracts user info from valid session', () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid',
        user_metadata: {
          sub: 'U1234567890',
          name: 'Test User',
          picture: 'https://example.com/pic.jpg',
        },
      },
    }
    const result = extractUserFromSession(mockSession as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U1234567890',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/pic.jpg',
    })
  })

  it('falls back to provider_id when sub is missing', () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid',
        user_metadata: {
          provider_id: 'U9999999999',
          full_name: 'Fallback Name',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      },
    }
    const result = extractUserFromSession(mockSession as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U9999999999',
      displayName: 'Fallback Name',
      avatarUrl: 'https://example.com/avatar.jpg',
    })
  })

  it('handles missing optional fields gracefully', () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid',
        user_metadata: {
          sub: 'U0000000000',
        },
      },
    }
    const result = extractUserFromSession(mockSession as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U0000000000',
      displayName: '',
      avatarUrl: null,
    })
  })
})

describe('isAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns false when ADMIN_LINE_USER_IDS is not set', () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', '')
    expect(isAdmin('U1234567890')).toBe(false)
  })

  it('returns true when user is in admin list', () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1111111111,U2222222222')
    expect(isAdmin('U1111111111')).toBe(true)
    expect(isAdmin('U2222222222')).toBe(true)
  })

  it('returns false when user is not in admin list', () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1111111111,U2222222222')
    expect(isAdmin('U9999999999')).toBe(false)
  })

  it('handles single admin ID', () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1111111111')
    expect(isAdmin('U1111111111')).toBe(true)
    expect(isAdmin('U2222222222')).toBe(false)
  })
})

const mockSession = {
  user: {
    id: 'supabase-uuid',
    user_metadata: {
      sub: 'U1234567890',
      name: 'Test Artist',
      picture: 'https://example.com/pic.jpg',
    },
  },
}

const mockAuthUser = {
  supabaseId: 'supabase-uuid',
  lineUserId: 'U1234567890',
  displayName: 'Test Artist',
  avatarUrl: 'https://example.com/pic.jpg',
}

const mockArtistRow = {
  id: 'artist-uuid',
  slug: 'test-artist',
  line_user_id: 'U1234567890',
  display_name: 'Test Artist',
  status: 'active' as const,
}

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns user when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } })

    const result = await getCurrentUser()

    expect(result).toEqual(mockAuthUser)
  })

  it('returns null when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })
})

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns user when authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession } })

    const result = await requireAuth()

    expect(result).toEqual(mockAuthUser)
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    await expect(requireAuth()).rejects.toThrow('UNAUTHORIZED')
  })
})

describe('getArtistForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns artist when found', async () => {
    const chain = makeThenable({ data: mockArtistRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getArtistForUser('U1234567890')

    expect(result).toEqual(mockArtistRow)
    expect(mockFrom).toHaveBeenCalledWith('artists')
  })

  it('returns null when artist not found', async () => {
    const chain = makeThenable({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    const result = await getArtistForUser('U_no_such_user')

    expect(result).toBeNull()
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns user when authenticated and is admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1234567890')
    mockGetSession.mockResolvedValue({ data: { session: mockSession } })

    const result = await requireAdmin()

    expect(result).toEqual(mockAuthUser)
  })

  it('throws FORBIDDEN when authenticated but not admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U_other_admin')
    mockGetSession.mockResolvedValue({ data: { session: mockSession } })

    await expect(requireAdmin()).rejects.toThrow('FORBIDDEN')
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1234567890')
    mockGetSession.mockResolvedValue({ data: { session: null } })

    await expect(requireAdmin()).rejects.toThrow('UNAUTHORIZED')
  })
})

describe('handleApiError', () => {
  it('returns 401 for UNAUTHORIZED error', async () => {
    const response = handleApiError(new Error('UNAUTHORIZED'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 for FORBIDDEN error', async () => {
    const response = handleApiError(new Error('FORBIDDEN'))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('returns 500 for unknown Error', async () => {
    const response = handleApiError(new Error('Something went wrong'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Internal server error' })
  })

  it('returns 500 for non-Error objects', async () => {
    const response = handleApiError('a plain string error')

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Internal server error' })
  })
})

describe('authorizeInquiryAccess', () => {
  const mockInquiry = {
    id: 'inquiry-uuid',
    consumer_line_id: 'U_consumer',
    artist_id: 'artist-uuid',
    status: 'pending' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('allows access and marks isConsumer true when user is the consumer', async () => {
    const consumerUser = { ...mockAuthUser, lineUserId: 'U_consumer' }
    const chain = makeThenable({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    const result = await authorizeInquiryAccess(consumerUser, mockInquiry as never)

    expect(result.isConsumer).toBe(true)
    expect(result.isArtist).toBe(false)
    expect(result.artist).toBeNull()
  })

  it('allows access and marks isArtist true when user is the artist', async () => {
    const artistUser = { ...mockAuthUser, lineUserId: 'U1234567890' }
    const chain = makeThenable({ data: mockArtistRow, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await authorizeInquiryAccess(artistUser, mockInquiry as never)

    expect(result.isConsumer).toBe(false)
    expect(result.isArtist).toBe(true)
    expect(result.artist).toEqual(mockArtistRow)
  })

  it('throws FORBIDDEN when user is neither consumer nor artist', async () => {
    const unrelatedUser = { ...mockAuthUser, lineUserId: 'U_unrelated' }
    const chain = makeThenable({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      authorizeInquiryAccess(unrelatedUser, mockInquiry as never),
    ).rejects.toThrow('FORBIDDEN')
  })
})
