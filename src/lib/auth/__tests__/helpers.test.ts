import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => mockClient),
}))

const mockReportError = vi.fn()
vi.mock('@/lib/observability', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}))

import {
  extractAuthUser,
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

describe('extractAuthUser', () => {
  it('returns null when no user', () => {
    const result = extractAuthUser(null)
    expect(result).toBeNull()
  })

  it('extracts identity from app_metadata and profile from user_metadata', () => {
    const mockUser = {
      id: 'supabase-uuid',
      app_metadata: { line_user_id: 'U1234567890' },
      user_metadata: {
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      },
    }
    const result = extractAuthUser(mockUser as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U1234567890',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/pic.jpg',
    })
  })

  it('NEVER trusts user_metadata for identity — user-editable (HAR-661)', () => {
    // A logged-in attacker can set arbitrary user_metadata via
    // supabase.auth.updateUser(); line_user_id there must be ignored.
    const spoofed = {
      id: 'supabase-uuid',
      app_metadata: {},
      user_metadata: {
        line_user_id: 'U_victim',
        sub: 'U_victim',
        provider_id: 'U_victim',
        name: 'Attacker',
      },
    }
    expect(extractAuthUser(spoofed as never)).toBeNull()
  })

  it('handles missing optional profile fields gracefully', () => {
    const mockUser = {
      id: 'supabase-uuid',
      app_metadata: { line_user_id: 'U0000000000' },
      user_metadata: {},
    }
    const result = extractAuthUser(mockUser as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U0000000000',
      displayName: '',
      avatarUrl: null,
    })
  })

  it('falls back to full_name / avatar_url for profile fields', () => {
    const mockUser = {
      id: 'supabase-uuid',
      app_metadata: { line_user_id: 'U9999999999' },
      user_metadata: {
        full_name: 'Fallback Name',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    }
    const result = extractAuthUser(mockUser as never)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U9999999999',
      displayName: 'Fallback Name',
      avatarUrl: 'https://example.com/avatar.jpg',
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

const mockSupabaseUser = {
  id: 'supabase-uuid',
  app_metadata: { line_user_id: 'U1234567890' },
  user_metadata: {
    name: 'Test Artist',
    picture: 'https://example.com/pic.jpg',
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

  it('returns user when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockSupabaseUser }, error: null })

    const result = await getCurrentUser()

    expect(result).toEqual(mockAuthUser)
  })

  it('returns null when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('returns null when user lacks app_metadata.line_user_id (spoof guard)', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'supabase-uuid',
          app_metadata: {},
          user_metadata: { sub: 'U_spoofed', name: 'Attacker' },
        },
      },
      error: null,
    })

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
    mockGetUser.mockResolvedValue({ data: { user: mockSupabaseUser }, error: null })

    const result = await requireAuth()

    expect(result).toEqual(mockAuthUser)
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

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
    mockGetUser.mockResolvedValue({ data: { user: mockSupabaseUser }, error: null })

    const result = await requireAdmin()

    expect(result).toEqual(mockAuthUser)
  })

  it('throws FORBIDDEN when authenticated but not admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U_other_admin')
    mockGetUser.mockResolvedValue({ data: { user: mockSupabaseUser }, error: null })

    await expect(requireAdmin()).rejects.toThrow('FORBIDDEN')
  })

  it('throws UNAUTHORIZED when not authenticated', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U1234567890')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAdmin()).rejects.toThrow('UNAUTHORIZED')
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    mockReportError.mockReset()
  })

  it('returns 401 for UNAUTHORIZED error without reporting', async () => {
    const response = handleApiError(new Error('UNAUTHORIZED'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mockReportError).not.toHaveBeenCalled()
  })

  it('returns 403 for FORBIDDEN error without reporting', async () => {
    const response = handleApiError(new Error('FORBIDDEN'))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'Forbidden' })
    expect(mockReportError).not.toHaveBeenCalled()
  })

  it('returns 500 for unknown Error and reports it', async () => {
    const err = new Error('Something went wrong')
    const response = handleApiError(err)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Internal server error' })
    expect(mockReportError).toHaveBeenCalledWith('api', err)
  })

  it('returns 500 for non-Error objects and reports them', async () => {
    const response = handleApiError('a plain string error')

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({ error: 'Internal server error' })
    expect(mockReportError).toHaveBeenCalledWith('api', 'a plain string error')
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
