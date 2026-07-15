import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { current, requireAuth, requireAdmin, getCurrentUser } from '../session'

describe('auth session (Node adapter)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('current returns null when no supabase user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(current()).resolves.toBeNull()
  })

  it('current maps app_metadata identity', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'su-1',
          app_metadata: { line_user_id: 'U_admin' },
          user_metadata: { name: 'A' },
        },
      },
    })
    await expect(current()).resolves.toEqual({
      supabaseId: 'su-1',
      lineUserId: 'U_admin',
      displayName: 'A',
      avatarUrl: null,
    })
  })

  it('getCurrentUser is an alias of current', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect(getCurrentUser).toBe(current)
  })

  it('requireAuth throws UNAUTHORIZED when missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(requireAuth()).rejects.toThrow('UNAUTHORIZED')
  })

  it('requireAdmin throws FORBIDDEN when not in admin list', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U_other')
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'su-1',
          app_metadata: { line_user_id: 'U_not_admin' },
          user_metadata: {},
        },
      },
    })
    await expect(requireAdmin()).rejects.toThrow('FORBIDDEN')
  })

  it('requireAdmin returns user when admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'U_admin')
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'su-1',
          app_metadata: { line_user_id: 'U_admin' },
          user_metadata: { name: 'Boss' },
        },
      },
    })
    await expect(requireAdmin()).resolves.toMatchObject({
      lineUserId: 'U_admin',
      displayName: 'Boss',
    })
  })
})
