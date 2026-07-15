import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Top-level mocks ────────────────────────────────────────────────────────
//
// IMPORTANT: `src/middleware.ts` creates `intlMiddleware` at module load time:
//
//   const intlMiddleware = createIntlMiddleware(routing)
//
// `vi.mock` factories are hoisted before all variable declarations, so we
// use `vi.hoisted()` to create `intlMiddlewareSpy` in the hoisted scope.
// The factory returns the same spy every time `createIntlMiddleware` is called,
// and per-test behaviour is set via `intlMiddlewareSpy.mockReturnValue(...)`.

const { intlMiddlewareSpy } = vi.hoisted(() => ({
  intlMiddlewareSpy: vi.fn(),
}))

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => intlMiddlewareSpy),
}))

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}))

vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['zh-TW', 'en'],
    defaultLocale: 'zh-TW',
  },
}))

// ── Import under test (after mocks) ───────────────────────────────────────

import { middleware } from '../middleware'
import { updateSession } from '@/lib/supabase/middleware'

const mockUpdateSession = vi.mocked(updateSession)

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockRequest(pathname: string, method = 'GET'): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, { method })
}

function makeIntlPassthroughResponse(): NextResponse {
  return new NextResponse(null, { status: 200 })
}

function makeIntlRedirectResponse(location: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { location } })
}

function makeSessionResponse(): NextResponse {
  return new NextResponse(null, { status: 200 })
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()

  // Default: i18n middleware does NOT redirect
  intlMiddlewareSpy.mockReturnValue(makeIntlPassthroughResponse())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('API route protection', () => {
  describe('POST /api/inquiries', () => {
    it('returns 401 when unauthenticated user POSTs to /api/inquiries', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/inquiries', 'POST'))

      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('allows authenticated user to POST /api/inquiries', async () => {
      const mockUser = { id: 'u1', user_metadata: { sub: 'Uline1' } }
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: mockUser as never })

      const result = await middleware(createMockRequest('/api/inquiries', 'POST'))

      expect(result.status).not.toBe(401)
    })

    it('allows unauthenticated GET to /api/inquiries without 401', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/inquiries', 'GET'))

      expect(result.status).not.toBe(401)
    })
  })

  describe('POST /api/inquiries/[id]/messages', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/inquiries/abc-123/messages', 'POST'))

      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('passes through when user is authenticated', async () => {
      const mockUser = { id: 'u1', user_metadata: {} }
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: mockUser as never })

      const result = await middleware(createMockRequest('/api/inquiries/abc-123/messages', 'POST'))

      expect(result.status).not.toBe(401)
    })
  })

  describe('POST /api/inquiries/[id]/quotes', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/inquiries/abc-123/quotes', 'POST'))

      expect(result.status).toBe(401)
    })

    it('allows GET to /api/inquiries/[id]/quotes without auth', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/inquiries/abc-123/quotes', 'GET'))

      expect(result.status).not.toBe(401)
    })
  })

  describe('POST /api/upload/signed-url', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/upload/signed-url', 'POST'))

      expect(result.status).toBe(401)
    })

    it('passes through when user is authenticated', async () => {
      const mockUser = { id: 'u1', user_metadata: {} }
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: mockUser as never })

      const result = await middleware(createMockRequest('/api/upload/signed-url', 'POST'))

      expect(result.status).not.toBe(401)
    })
  })

  describe('non-protected API routes', () => {
    it('passes through GET /api/artists without auth', async () => {
      const sessionResponse = makeSessionResponse()
      mockUpdateSession.mockResolvedValue({ response: sessionResponse, user: null })

      const result = await middleware(createMockRequest('/api/artists', 'GET'))

      expect(result.status).not.toBe(401)
      const location = result.headers.get('location')
      expect(location).toBeNull()
    })

    it('passes through GET /api/styles without auth', async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest('/api/styles', 'GET'))

      expect(result.status).not.toBe(401)
    })
  })
})

describe('Artist dashboard route protection', () => {
  // Locales include mixed-case zh-TW — must protect those paths too.
  const artistRoutes = [
    '/artist/dashboard',
    '/artist/profile',
    '/artist/portfolio',
    '/artist/calendar',
    '/artist/clients',
    '/artist/settings',
    '/artist/stats',
    '/en/artist/portfolio',
    '/zh-TW/artist/dashboard',
    '/zh-TW/artist/inquiries',
  ]

  for (const route of artistRoutes) {
    it(`redirects unauthenticated user away from ${route}`, async () => {
      mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

      const result = await middleware(createMockRequest(route))

      expect([301, 302, 307, 308]).toContain(result.status)
      const location = result.headers.get('location')
      expect(location).toContain('/api/auth/line')
    })
  }

  it('includes the original pathname as the redirect query param', async () => {
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    const result = await middleware(createMockRequest('/artist/dashboard'))

    const location = result.headers.get('location')!
    const locationUrl = new URL(location)
    expect(locationUrl.searchParams.get('redirect')).toBe('/artist/dashboard')
  })

  it('allows authenticated user through /artist/dashboard (no LINE login redirect)', async () => {
    const mockUser = { id: 'u1', user_metadata: { sub: 'Uartist1' } }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: mockUser as never })

    const result = await middleware(createMockRequest('/artist/dashboard'))

    const location = result.headers.get('location')
    // Either no redirect at all, or a redirect that is NOT the LINE login
    if (location !== null) {
      expect(location).not.toContain('/api/auth/line')
    }
  })
})

describe('Admin route protection', () => {
  it('redirects unauthenticated user away from /admin', async () => {
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    const result = await middleware(createMockRequest('/admin'))

    expect([301, 302, 307, 308]).toContain(result.status)
    const location = result.headers.get('location')
    expect(location).toContain('/api/auth/line')
  })

  it('includes the original pathname as the redirect query param for /admin', async () => {
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    const result = await middleware(createMockRequest('/admin'))

    const location = result.headers.get('location')!
    const url = new URL(location)
    expect(url.searchParams.get('redirect')).toBe('/admin')
  })

  it('redirects non-admin to /forbidden (not silent home)', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1,Uadmin2')

    const nonAdminUser = { id: 'u-not-admin', app_metadata: { line_user_id: 'Unot_admin' } }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: nonAdminUser as never })

    const result = await middleware(createMockRequest('/admin'))

    expect([301, 302, 307, 308]).toContain(result.status)
    const location = result.headers.get('location')
    expect(location).not.toContain('/api/auth/line')
    expect(new URL(location!).pathname).toBe('/forbidden')
  })

  it('redirects non-admin on /zh-TW/admin to /zh-TW/forbidden', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1')

    const nonAdminUser = { id: 'u-not-admin', app_metadata: { line_user_id: 'Unot_admin' } }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: nonAdminUser as never })

    const result = await middleware(createMockRequest('/zh-TW/admin'))

    expect([301, 302, 307, 308]).toContain(result.status)
    expect(new URL(result.headers.get('location')!).pathname).toBe('/zh-TW/forbidden')
  })

  it('allows admin user with matching app_metadata line_user_id to access /admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1,Uadmin2')

    const adminUser = { id: 'u-admin', app_metadata: { line_user_id: 'Uadmin1' }, user_metadata: {} }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: adminUser as never })

    const result = await middleware(createMockRequest('/admin'))

    // Should NOT redirect to LINE login or to forbidden
    const location = result.headers.get('location')
    if (location !== null) {
      const loc = new URL(location)
      expect(loc.pathname).not.toBe('/')
      expect(loc.pathname).not.toBe('/forbidden')
      expect(loc.searchParams.get('redirect')).toBeNull()
    }
  })

  it('allows admin through /zh-TW/admin', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1')

    const adminUser = { id: 'u-admin', app_metadata: { line_user_id: 'Uadmin1' }, user_metadata: {} }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: adminUser as never })

    const result = await middleware(createMockRequest('/zh-TW/admin'))

    const location = result.headers.get('location')
    if (location !== null) {
      expect(new URL(location).pathname).not.toBe('/zh-TW/forbidden')
      expect(location).not.toContain('/api/auth/line')
    }
  })

  it('rejects admin ids forged in client-editable user_metadata (HAR-661)', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1')

    // user_metadata is writable via auth.updateUser() — must never grant admin
    const spoofedUser = {
      id: 'u-spoof',
      app_metadata: {},
      user_metadata: { sub: 'Uadmin1', line_user_id: 'Uadmin1' },
    }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: spoofedUser as never })

    const result = await middleware(createMockRequest('/admin'))

    expect([301, 302, 307, 308]).toContain(result.status)
    expect(new URL(result.headers.get('location')!).pathname).toBe('/forbidden')
  })

  it('redirects to /forbidden when authenticated user has no LINE id in app_metadata', async () => {
    vi.stubEnv('ADMIN_LINE_USER_IDS', 'Uadmin1')

    const userNoId = { id: 'u-no-line', app_metadata: {}, user_metadata: {} }
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: userNoId as never })

    const result = await middleware(createMockRequest('/admin'))

    expect([301, 302, 307, 308]).toContain(result.status)
    expect(new URL(result.headers.get('location')!).pathname).toBe('/forbidden')
  })

  it('protects locale-prefixed admin routes /en/admin and /zh-TW/admin when logged out', async () => {
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    for (const path of ['/en/admin', '/zh-TW/admin']) {
      const result = await middleware(createMockRequest(path))
      expect([301, 302, 307, 308]).toContain(result.status)
      expect(result.headers.get('location')).toContain('/api/auth/line')
    }
  })
})

describe('Public route handling with i18n middleware', () => {
  it('passes public routes through i18n middleware', async () => {
    const intlResponse = makeIntlPassthroughResponse()
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })
    intlMiddlewareSpy.mockReturnValue(intlResponse)

    const request = createMockRequest('/artists')
    const result = await middleware(request)

    expect(intlMiddlewareSpy).toHaveBeenCalledWith(request)
    expect(result).toBe(intlResponse)
  })

  it('returns the i18n redirect when intl middleware issues one', async () => {
    const intlRedirect = makeIntlRedirectResponse('http://localhost:3000/zh-TW/artists')
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })
    intlMiddlewareSpy.mockReturnValue(intlRedirect)

    const result = await middleware(createMockRequest('/artists'))

    expect(result.headers.get('location')).toBe('http://localhost:3000/zh-TW/artists')
  })

  it('merges Supabase session headers into the i18n response', async () => {
    const sessionResponse = new NextResponse(null, {
      status: 200,
      headers: { 'x-supabase-session': 'token-abc' },
    })
    const intlResponse = makeIntlPassthroughResponse()
    mockUpdateSession.mockResolvedValue({ response: sessionResponse, user: null })
    intlMiddlewareSpy.mockReturnValue(intlResponse)

    const result = await middleware(createMockRequest('/'))

    expect(result.headers.get('x-supabase-session')).toBe('token-abc')
  })

  it('does not copy content-type from the session response into the i18n response', async () => {
    const sessionResponse = new NextResponse(null, {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-custom': 'yes' },
    })
    const intlResponse = makeIntlPassthroughResponse()
    mockUpdateSession.mockResolvedValue({ response: sessionResponse, user: null })
    intlMiddlewareSpy.mockReturnValue(intlResponse)

    const result = await middleware(createMockRequest('/'))

    // Custom header forwarded
    expect(result.headers.get('x-custom')).toBe('yes')
    // content-type must NOT be overwritten to 'application/json'
    expect(result.headers.get('content-type')).not.toBe('application/json')
  })
})

describe('E2E_AUTH_BYPASS mode', () => {
  it('skips auth redirects for artist routes when E2E_AUTH_BYPASS is true', async () => {
    vi.stubEnv('E2E_AUTH_BYPASS', 'true')

    // No user — would normally redirect unauthenticated to LINE login
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    const result = await middleware(createMockRequest('/artist/dashboard'))

    // With bypass enabled, there should be no LINE login redirect
    const location = result.headers.get('location')
    if (location !== null) {
      expect(location).not.toContain('/api/auth/line')
    }
  })

  it('still enforces auth on API routes when E2E_AUTH_BYPASS is true', async () => {
    vi.stubEnv('E2E_AUTH_BYPASS', 'true')

    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })

    const result = await middleware(createMockRequest('/api/inquiries', 'POST'))

    // API routes are not bypassed
    expect(result.status).toBe(401)
  })

  it('applies i18n middleware for non-API routes in bypass mode', async () => {
    vi.stubEnv('E2E_AUTH_BYPASS', 'true')

    const intlResponse = makeIntlPassthroughResponse()
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })
    intlMiddlewareSpy.mockReturnValue(intlResponse)

    const request = createMockRequest('/artists')
    const result = await middleware(request)

    expect(intlMiddlewareSpy).toHaveBeenCalledWith(request)
    expect(result).toBe(intlResponse)
  })

  it('returns i18n redirect immediately in bypass mode when intl issues a redirect', async () => {
    vi.stubEnv('E2E_AUTH_BYPASS', 'true')

    const intlRedirect = makeIntlRedirectResponse('http://localhost:3000/zh-TW/artist/dashboard')
    mockUpdateSession.mockResolvedValue({ response: makeSessionResponse(), user: null })
    intlMiddlewareSpy.mockReturnValue(intlRedirect)

    const result = await middleware(createMockRequest('/artist/dashboard'))

    expect(result.headers.get('location')).toBe('http://localhost:3000/zh-TW/artist/dashboard')
  })
})
