import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks must be declared before the module under test is imported.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

import { POST } from '../route'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

const mockCreateServerClient = vi.mocked(createServerClient)
const mockCreateAdminClient = vi.mocked(createAdminClient)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(body?: Record<string, unknown>): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
  } as unknown as NextRequest
}

function buildSupabaseMock(signInError: { message: string } | null = null) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInError }),
    },
  }
}

function buildAdminMock({
  createError = null as { message: string } | null,
  users = [] as { id: string; email: string }[],
} = {}) {
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ error: createError }),
        listUsers: vi.fn().mockResolvedValue({ data: { users } }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/dev-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  })

  // -------------------------------------------------------------------------
  // Guard: non-development environments
  // -------------------------------------------------------------------------

  it('returns 404 when NODE_ENV is not development', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const request = createMockRequest({ line_user_id: 'U123', display_name: 'Test' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Not available')
  })

  it('returns 404 when NODE_ENV is test', async () => {
    vi.stubEnv('NODE_ENV', 'test')

    const request = createMockRequest()
    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  // -------------------------------------------------------------------------
  // Happy path: sign-in succeeds on the first attempt
  // -------------------------------------------------------------------------

  it('returns ok with email, lineUserId, and displayName when sign-in succeeds immediately', async () => {
    const supabase = buildSupabaseMock(null)
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(buildAdminMock() as never)

    const request = createMockRequest({ line_user_id: 'Uabc123', display_name: 'Alice' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.lineUserId).toBe('Uabc123')
    expect(body.displayName).toBe('Alice')
    expect(body.email).toBe('uabc123@line.inkhunt.local')
  })

  it('does not call admin.createUser when first sign-in succeeds', async () => {
    const supabase = buildSupabaseMock(null)
    const admin = buildAdminMock()
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(admin as never)

    await POST(createMockRequest({ line_user_id: 'U999' }))

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Default values
  // -------------------------------------------------------------------------

  it('uses default line_user_id and display_name when body is empty', async () => {
    const supabase = buildSupabaseMock(null)
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(buildAdminMock() as never)

    const request = createMockRequest({})
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.lineUserId).toBe('dev-user-001')
    expect(body.displayName).toBe('Dev User')
    expect(body.email).toBe('dev-user-001@line.inkhunt.local')
  })

  // -------------------------------------------------------------------------
  // Malformed JSON body
  // -------------------------------------------------------------------------

  it('handles malformed JSON body and falls back to defaults', async () => {
    const supabase = buildSupabaseMock(null)
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(buildAdminMock() as never)

    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    } as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.lineUserId).toBe('dev-user-001')
    expect(body.displayName).toBe('Dev User')
  })

  // -------------------------------------------------------------------------
  // Create-user path: first sign-in fails, create succeeds, retry succeeds
  // -------------------------------------------------------------------------

  it('creates user and retries sign-in when first sign-in fails', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
      .mockResolvedValueOnce({ error: null })

    const supabase = { auth: { signInWithPassword } }
    const admin = buildAdminMock({ createError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(admin as never)

    const request = createMockRequest({ line_user_id: 'Unew', display_name: 'New User' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(admin.auth.admin.createUser).toHaveBeenCalledOnce()
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'unew@line.inkhunt.local',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          line_user_id: 'Unew',
          name: 'New User',
          provider: 'line',
        }),
      })
    )
    expect(signInWithPassword).toHaveBeenCalledTimes(2)
  })

  // -------------------------------------------------------------------------
  // Update-password path: create fails (user exists), update password, retry
  // -------------------------------------------------------------------------

  it('updates password when createUser fails because user already exists, then retries', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
      .mockResolvedValueOnce({ error: null })

    const supabase = { auth: { signInWithPassword } }
    const existingUser = { id: 'existing-uuid', email: 'uexist@line.inkhunt.local' }
    const admin = buildAdminMock({
      createError: { message: 'User already registered' },
      users: [existingUser],
    })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(admin as never)

    const request = createMockRequest({ line_user_id: 'Uexist' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(admin.auth.admin.listUsers).toHaveBeenCalledWith({ page: 1, perPage: 50 })
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'existing-uuid',
      expect.objectContaining({ password: expect.any(String) })
    )
  })

  it('still retries sign-in even when create fails and no matching user is found in listUsers', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
      .mockResolvedValueOnce({ error: null })

    const supabase = { auth: { signInWithPassword } }
    const admin = buildAdminMock({
      createError: { message: 'Some create error' },
      users: [], // no users returned — nothing to update
    })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(admin as never)

    const request = createMockRequest({ line_user_id: 'Ughost' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Retry sign-in also fails → 500
  // -------------------------------------------------------------------------

  it('returns 500 when retry sign-in also fails after user creation', async () => {
    const signInWithPassword = vi.fn()
      .mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
      .mockResolvedValueOnce({ error: { message: 'Auth service unavailable' } })

    const supabase = { auth: { signInWithPassword } }
    const admin = buildAdminMock({ createError: null })
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(admin as never)

    const request = createMockRequest({ line_user_id: 'Ufail' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Auth service unavailable')
  })

  // -------------------------------------------------------------------------
  // HMAC password derivation is deterministic
  // -------------------------------------------------------------------------

  it('derives the same password for the same line_user_id', async () => {
    const capturedPasswords: string[] = []

    const signInWithPassword = vi.fn().mockImplementation(({ password }: { password: string }) => {
      capturedPasswords.push(password)
      return Promise.resolve({ error: null })
    })
    const supabase = { auth: { signInWithPassword } }
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(buildAdminMock() as never)

    await POST(createMockRequest({ line_user_id: 'Uidem' }))
    await POST(createMockRequest({ line_user_id: 'Uidem' }))

    expect(capturedPasswords).toHaveLength(2)
    expect(capturedPasswords[0]).toBe(capturedPasswords[1])
    // password must be a hex string (64 chars for sha256)
    expect(capturedPasswords[0]).toMatch(/^[0-9a-f]{64}$/)
  })

  // -------------------------------------------------------------------------
  // Email is derived from lowercased line_user_id
  // -------------------------------------------------------------------------

  it('lowercases the line_user_id when constructing the email', async () => {
    const supabase = buildSupabaseMock(null)
    mockCreateServerClient.mockResolvedValue(supabase as never)
    mockCreateAdminClient.mockReturnValue(buildAdminMock() as never)

    const response = await POST(createMockRequest({ line_user_id: 'UUPPERCASE' }))
    const body = await response.json()

    expect(body.email).toBe('uuppercase@line.inkhunt.local')
  })
})
