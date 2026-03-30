import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks must be declared before the module under test is imported.

const mockCookieGet = vi.fn()
const mockCookieDelete = vi.fn()
const mockCookieStore = {
  get: mockCookieGet,
  delete: mockCookieDelete,
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/line/auth', () => ({
  exchangeCodeForTokens: vi.fn(),
  getLineProfile: vi.fn(),
}))

import { GET } from '../route'
import { cookies } from 'next/headers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getLineProfile } from '@/lib/line/auth'

const mockCookies = vi.mocked(cookies)
const mockCreateServerClient = vi.mocked(createServerClient)
const mockCreateAdminClient = vi.mocked(createAdminClient)
const mockExchangeCodeForTokens = vi.mocked(exchangeCodeForTokens)
const mockGetLineProfile = vi.mocked(getLineProfile)

// ---- helpers ----------------------------------------------------------------

function makeRequest(searchParams: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/auth/line/callback')
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

function makeSupabaseClient({
  signInWithIdTokenError = null as unknown,
  signInWithPasswordError = null as unknown,
} = {}) {
  return {
    auth: {
      signInWithIdToken: vi.fn().mockResolvedValue({ error: signInWithIdTokenError }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInWithPasswordError }),
    },
  }
}

function makeAdminClient({
  createUserError = null as unknown,
  updateUserError = null as unknown,
  listUsersPage1 = [{ id: 'user-uuid-123', email: 'utest@line.inkhunt.local' }] as Array<{ id: string; email: string }>,
} = {}) {
  const listUsers = vi.fn().mockResolvedValue({
    data: { users: listUsersPage1 },
  })
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ error: createUserError }),
        updateUserById: vi.fn().mockResolvedValue({ error: updateUserError }),
        listUsers,
      },
    },
  }
}

// ---- setup ------------------------------------------------------------------

const BASE_URL = 'https://inkhunt.tw'

const PROFILE = {
  userId: 'Utest123',
  displayName: 'Test User',
  pictureUrl: 'https://profile.line-scdn.net/test.jpg',
}

const TOKENS = {
  access_token: 'access-token-abc',
  id_token: 'id-token-xyz',
  token_type: 'Bearer',
  expires_in: 2592000,
  refresh_token: 'refresh-token',
  scope: 'profile openid email',
}

// ---- tests ------------------------------------------------------------------

describe('GET /api/auth/line/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-secret')

    // Default cookie store: valid matching state, nonce, redirect
    mockCookies.mockResolvedValue(mockCookieStore as never)
    mockCookieGet.mockImplementation((name: string) => {
      const values: Record<string, string> = {
        line_auth_state: 'valid-state-123',
        line_auth_nonce: 'valid-nonce-456',
        line_auth_redirect: '/artist/dashboard',
      }
      return values[name] ? { value: values[name] } : undefined
    })

    mockExchangeCodeForTokens.mockResolvedValue(TOKENS)
    mockGetLineProfile.mockResolvedValue(PROFILE)
  })

  // ---------- early error returns (no cookie access needed) ------------------

  it('redirects with auth_error param when error query param is present', async () => {
    const request = makeRequest({ error: 'access_denied', code: 'some-code', state: 'some-state' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    // NextResponse.redirect normalises bare origins by appending a trailing slash.
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=access_denied`,
    )
  })

  it('redirects with no_code when code query param is missing', async () => {
    const request = makeRequest({ state: 'some-state' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=no_code`,
    )
  })

  // ---------- state validation -----------------------------------------------

  it('redirects with invalid_state when stored state is absent', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'line_auth_state') return undefined
      return undefined
    })
    const request = makeRequest({ code: 'auth-code-abc', state: 'some-state' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=invalid_state`,
    )
  })

  it('redirects with invalid_state when stored state does not match request state', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'line_auth_state') return { value: 'stored-state-xyz' }
      return undefined
    })
    const request = makeRequest({ code: 'auth-code-abc', state: 'different-state' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=invalid_state`,
    )
  })

  // ---------- happy path: OIDC succeeds --------------------------------------

  it('redirects to the stored redirect path when OIDC sign-in succeeds', async () => {
    const supabase = makeSupabaseClient({ signInWithIdTokenError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/artist/dashboard`)
  })

  it('calls signInWithIdToken with the id_token and stored nonce', async () => {
    const supabase = makeSupabaseClient({ signInWithIdTokenError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    await GET(request)

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'kakao',
      token: TOKENS.id_token,
      nonce: 'valid-nonce-456',
    })
  })

  // ---------- happy path: OIDC fails, password sign-in succeeds -------------

  it('falls back to password sign-in when OIDC fails and password sign-in succeeds', async () => {
    const supabase = makeSupabaseClient({
      signInWithIdTokenError: { message: 'OIDC not configured' },
      signInWithPasswordError: null,
    })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(makeAdminClient() as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/artist/dashboard`)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'utest123@line.inkhunt.local' }),
    )
  })

  // ---------- OIDC fails, password fails, create user succeeds ---------------

  it('creates user when OIDC fails and both password sign-in attempts fail on first try', async () => {
    // signInWithPassword is called twice: first returns error, second returns null (after create)
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
      .mockResolvedValueOnce({ error: null })

    const supabase = {
      auth: {
        signInWithIdToken: vi.fn().mockResolvedValue({ error: { message: 'OIDC failed' } }),
        signInWithPassword,
      },
    }
    const adminClient = makeAdminClient({ createUserError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(adminClient as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/artist/dashboard`)
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'utest123@line.inkhunt.local',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          line_user_id: PROFILE.userId,
          name: PROFILE.displayName,
          provider: 'line',
        }),
      }),
    )
  })

  // ---------- OIDC fails, password fails, create fails → update (migration) --

  it('updates existing user when create fails (password migration path)', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
      .mockResolvedValueOnce({ error: null })

    const supabase = {
      auth: {
        signInWithIdToken: vi.fn().mockResolvedValue({ error: { message: 'OIDC failed' } }),
        signInWithPassword,
      },
    }
    const adminClient = makeAdminClient({
      createUserError: { message: 'User already registered' },
      listUsersPage1: [{ id: 'existing-user-uuid', email: 'utest123@line.inkhunt.local' }],
    })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(adminClient as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/artist/dashboard`)
    expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      'existing-user-uuid',
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          line_user_id: PROFILE.userId,
          provider: 'line',
        }),
      }),
    )
  })

  // ---------- cookie cleanup -------------------------------------------------

  it('deletes all three auth cookies after a successful sign-in', async () => {
    const supabase = makeSupabaseClient({ signInWithIdTokenError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    await GET(request)

    const deletedCookies = mockCookieDelete.mock.calls.map((call) => call[0])
    expect(deletedCookies).toContain('line_auth_state')
    expect(deletedCookies).toContain('line_auth_nonce')
    expect(deletedCookies).toContain('line_auth_redirect')
  })

  it('redirects to "/" when line_auth_redirect cookie is absent', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'line_auth_state') return { value: 'valid-state-123' }
      if (name === 'line_auth_nonce') return { value: 'valid-nonce-456' }
      if (name === 'line_auth_redirect') return undefined
      return undefined
    })

    const supabase = makeSupabaseClient({ signInWithIdTokenError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/`)
  })

  // ---------- exception handling ---------------------------------------------

  it('redirects with callback_failed when exchangeCodeForTokens throws', async () => {
    mockExchangeCodeForTokens.mockRejectedValue(new Error('Network timeout'))

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=callback_failed`,
    )
  })

  it('redirects with callback_failed when getLineProfile throws', async () => {
    mockGetLineProfile.mockRejectedValue(new Error('LINE API unreachable'))

    const supabase = makeSupabaseClient({ signInWithIdTokenError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)

    const request = makeRequest({ code: 'auth-code-abc', state: 'valid-state-123' })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      `${BASE_URL}/?auth_error=callback_failed`,
    )
  })
})
