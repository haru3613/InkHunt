import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLineAuthUrl, exchangeCodeForTokens } from '../auth'

describe('getLineAuthUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ID', 'test-channel-id')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
  })

  it('returns a valid LINE authorize URL with required params', () => {
    const { url, state, nonce } = getLineAuthUrl()
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://access.line.me')
    expect(parsed.pathname).toBe('/oauth2/v2.1/authorize')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('client_id')).toBe('test-channel-id')
    expect(parsed.searchParams.get('scope')).toContain('profile')
    expect(parsed.searchParams.get('scope')).toContain('openid')
    expect(parsed.searchParams.get('state')).toBe(state)
    expect(parsed.searchParams.get('nonce')).toBe(nonce)
    expect(state).toBeTruthy()
    expect(nonce).toBeTruthy()
  })

  it('includes redirect_uri pointing to callback endpoint', () => {
    const { url } = getLineAuthUrl()
    const parsed = new URL(url)
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/line/callback'
    )
  })
})

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ID', 'test-channel-id')
    vi.stubEnv('LINE_CHANNEL_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
  })

  it('calls LINE token endpoint with correct params', async () => {
    const mockResponse = {
      access_token: 'access-123',
      id_token: 'id-token-jwt',
      token_type: 'Bearer',
      expires_in: 2592000,
      refresh_token: 'refresh-123',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await exchangeCodeForTokens('auth-code-123')
    expect(result.id_token).toBe('id-token-jwt')
    expect(result.access_token).toBe('access-123')

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toBe('https://api.line.me/oauth2/v2.1/token')
    const body = fetchCall[1]?.body as URLSearchParams
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('auth-code-123')
    expect(body.get('client_id')).toBe('test-channel-id')
    expect(body.get('client_secret')).toBe('test-secret')
  })

  it('throws on failed token exchange', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    })

    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
      'LINE token exchange failed'
    )
  })
})
