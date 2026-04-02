import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks must be declared before the module under test is imported.

const mockCookieSet = vi.fn()
const mockCookieStore = { set: mockCookieSet }

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/line/auth', () => ({
  getLineAuthUrl: vi.fn(),
}))

import { GET } from '../route'
import { cookies } from 'next/headers'
import { getLineAuthUrl } from '@/lib/line/auth'

const mockCookies = vi.mocked(cookies)
const mockGetLineAuthUrl = vi.mocked(getLineAuthUrl)

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/auth/line', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookies.mockResolvedValue(mockCookieStore as never)
    mockGetLineAuthUrl.mockReturnValue({
      url: 'https://access.line.me/oauth2/v2.1/authorize?foo=bar',
      state: 'test-state-abc',
      nonce: 'test-nonce-xyz',
    })
    vi.stubEnv('NODE_ENV', 'test')
  })

  it('redirects to the LINE authorization URL returned by getLineAuthUrl', async () => {
    const request = makeRequest('http://localhost:3000/api/auth/line')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://access.line.me/oauth2/v2.1/authorize?foo=bar',
    )
  })

  it('sets line_auth_state cookie with the state value from getLineAuthUrl', async () => {
    const request = makeRequest('http://localhost:3000/api/auth/line')

    await GET(request)

    expect(mockCookieSet).toHaveBeenCalledWith(
      'line_auth_state',
      'test-state-abc',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      }),
    )
  })

  it('sets line_auth_nonce cookie with the nonce value from getLineAuthUrl', async () => {
    const request = makeRequest('http://localhost:3000/api/auth/line')

    await GET(request)

    expect(mockCookieSet).toHaveBeenCalledWith(
      'line_auth_nonce',
      'test-nonce-xyz',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      }),
    )
  })

  it('sets line_auth_redirect cookie to "/" when no redirect query param is provided', async () => {
    const request = makeRequest('http://localhost:3000/api/auth/line')

    await GET(request)

    expect(mockCookieSet).toHaveBeenCalledWith(
      'line_auth_redirect',
      '/',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      }),
    )
  })

  it('sets line_auth_redirect cookie to the custom redirect query param value', async () => {
    const request = makeRequest(
      'http://localhost:3000/api/auth/line?redirect=/artist/dashboard',
    )

    await GET(request)

    expect(mockCookieSet).toHaveBeenCalledWith(
      'line_auth_redirect',
      '/artist/dashboard',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      }),
    )
  })

  it('sets all three cookies on every request', async () => {
    const request = makeRequest('http://localhost:3000/api/auth/line')

    await GET(request)

    const cookieNames = mockCookieSet.mock.calls.map((call) => call[0])
    expect(cookieNames).toContain('line_auth_state')
    expect(cookieNames).toContain('line_auth_nonce')
    expect(cookieNames).toContain('line_auth_redirect')
    expect(mockCookieSet).toHaveBeenCalledTimes(3)
  })
})
