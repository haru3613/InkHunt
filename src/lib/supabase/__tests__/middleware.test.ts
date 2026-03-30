import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ── Module-level state used by the mock factory ────────────────────────────
//
// The mock factory for @supabase/ssr runs once at hoist time.  We capture the
// cookies callbacks into these module-level variables so individual tests can
// inspect them after calling `updateSession`.

let capturedCookiesGetAll: (() => unknown[]) | undefined
let capturedCookiesSetAll: ((cookies: unknown[]) => void) | undefined

const mockGetUser = vi.fn()

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
}

// ── Top-level mocks (hoisted by Vitest) ───────────────────────────────────

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: {
        cookies: {
          getAll: () => unknown[]
          setAll: (cookies: unknown[]) => void
        }
      },
    ) => {
      capturedCookiesGetAll = options.cookies.getAll
      capturedCookiesSetAll = options.cookies.setAll
      return mockSupabaseClient
    },
  ),
}))

// ── Import order: after mocks ──────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockRequest(
  overrides: Partial<{
    url: string
    cookies: {
      getAll: () => unknown[]
      set: (name: string, value: string) => void
    }
  }> = {},
): NextRequest {
  const cookieStore = new Map<string, string>()
  return {
    url: 'http://localhost:3000/',
    cookies: {
      getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => cookieStore.set(name, value),
      ...overrides.cookies,
    },
    ...overrides,
  } as unknown as NextRequest
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('updateSession (supabase middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    capturedCookiesGetAll = undefined
    capturedCookiesSetAll = undefined
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // updateSession reads env vars at call time (not module load time), so we
  // import it once at the top level — no dynamic re-imports needed.
  // The env vars are stubbed per-test.

  describe('when Supabase env vars are missing', () => {
    it('returns null user when both env vars are absent', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

      const { updateSession } = await import('../middleware')
      const { user } = await updateSession(createMockRequest())

      expect(user).toBeNull()
    })

    it('returns a NextResponse when env vars are absent', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

      const { updateSession } = await import('../middleware')
      const { response } = await updateSession(createMockRequest())

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('does not call createServerClient when env vars are missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

      const { updateSession } = await import('../middleware')
      await updateSession(createMockRequest())

      expect(createServerClient).not.toHaveBeenCalled()
    })

    it('returns null user when only URL is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')

      const { updateSession } = await import('../middleware')
      const { user } = await updateSession(createMockRequest())

      expect(user).toBeNull()
    })

    it('returns null user when only anon key is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

      const { updateSession } = await import('../middleware')
      const { user } = await updateSession(createMockRequest())

      expect(user).toBeNull()
    })
  })

  describe('when Supabase env vars are configured', () => {
    const TEST_URL = 'https://example.supabase.co'
    const TEST_KEY = 'test-anon-key'

    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', TEST_URL)
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', TEST_KEY)
    })

    it('calls createServerClient with the correct URL and key', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { updateSession } = await import('../middleware')
      await updateSession(createMockRequest())

      expect(createServerClient).toHaveBeenCalledWith(
        TEST_URL,
        TEST_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      )
    })

    it('returns the user when auth.getUser resolves with a user', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        user_metadata: { sub: 'Uline123' },
      }
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const { updateSession } = await import('../middleware')
      const { user } = await updateSession(createMockRequest())

      expect(user).toEqual(mockUser)
    })

    it('returns null user when auth.getUser resolves with null', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { updateSession } = await import('../middleware')
      const { user } = await updateSession(createMockRequest())

      expect(user).toBeNull()
    })

    it('returns a NextResponse even when user is authenticated', async () => {
      const mockUser = { id: 'user-uuid', user_metadata: {} }
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const { updateSession } = await import('../middleware')
      const { response } = await updateSession(createMockRequest())

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('wires the cookies.getAll callback to request.cookies.getAll', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const cookieGetAll = vi.fn().mockReturnValue([{ name: 'sb-token', value: 'abc' }])
      const request = createMockRequest({ cookies: { getAll: cookieGetAll, set: vi.fn() } })

      const { updateSession } = await import('../middleware')
      await updateSession(request)

      // capturedCookiesGetAll is the function passed to createServerClient.
      // Calling it must delegate to request.cookies.getAll.
      expect(capturedCookiesGetAll).toBeDefined()
      const result = capturedCookiesGetAll!()
      expect(cookieGetAll).toHaveBeenCalled()
      expect(result).toEqual([{ name: 'sb-token', value: 'abc' }])
    })

    it('the cookies.setAll callback updates request cookies and rebuilds the response', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const cookieSet = vi.fn()
      const request = createMockRequest({ cookies: { getAll: vi.fn().mockReturnValue([]), set: cookieSet } })

      const { updateSession } = await import('../middleware')
      await updateSession(request)

      expect(capturedCookiesSetAll).toBeDefined()

      // Invoking setAll should call request.cookies.set for each cookie
      capturedCookiesSetAll!([{ name: 'access-token', value: 'tok', options: { httpOnly: true } }])

      expect(cookieSet).toHaveBeenCalledWith('access-token', 'tok')
    })
  })
})
