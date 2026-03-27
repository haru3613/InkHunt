import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractUserFromSession, isAdmin } from '../helpers'

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
