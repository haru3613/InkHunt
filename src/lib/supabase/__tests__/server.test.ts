import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => 'ssr-client') }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => 'admin-client') }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

const mockCreateSSRServerClient = vi.mocked(createSSRServerClient)
const mockCreateClient = vi.mocked(createClient)
const mockCookies = vi.mocked(cookies)

describe('createServerClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

    mockCreateSSRServerClient.mockReturnValue('ssr-client' as ReturnType<typeof createSSRServerClient>)
    mockCookies.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>)
  })

  it('calls createSSRServerClient with the correct URL and anon key', async () => {
    const { createServerClient } = await import('../server')
    await createServerClient()

    expect(mockCreateSSRServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it('returns the Supabase client produced by createSSRServerClient', async () => {
    const { createServerClient } = await import('../server')
    const client = await createServerClient()

    expect(client).toBe('ssr-client')
  })

  it('cookie getAll callback delegates to cookieStore.getAll', async () => {
    const mockGetAll = vi.fn(() => [{ name: 'sb-token', value: 'abc' }])
    mockCookies.mockResolvedValue({
      getAll: mockGetAll,
      set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createServerClient } = await import('../server')
    await createServerClient()

    const cookiesArg = mockCreateSSRServerClient.mock.calls[0][2] as {
      cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void }
    }
    const result = cookiesArg.cookies.getAll()

    expect(mockGetAll).toHaveBeenCalledOnce()
    expect(result).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('cookie setAll callback calls cookieStore.set for each cookie', async () => {
    const mockSet = vi.fn()
    mockCookies.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: mockSet,
    } as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createServerClient } = await import('../server')
    await createServerClient()

    const cookiesArg = mockCreateSSRServerClient.mock.calls[0][2] as {
      cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options: object }[]) => void }
    }
    cookiesArg.cookies.setAll([
      { name: 'token-a', value: 'val-a', options: { httpOnly: true } },
      { name: 'token-b', value: 'val-b', options: {} },
    ])

    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenNthCalledWith(1, 'token-a', 'val-a', { httpOnly: true })
    expect(mockSet).toHaveBeenNthCalledWith(2, 'token-b', 'val-b', {})
  })

  it('setAll swallows errors thrown by cookieStore.set in Server Component context', async () => {
    const mockSet = vi.fn(() => { throw new Error('Cannot set cookies in Server Component') })
    mockCookies.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: mockSet,
    } as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createServerClient } = await import('../server')
    await createServerClient()

    const cookiesArg = mockCreateSSRServerClient.mock.calls[0][2] as {
      cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options: object }[]) => void }
    }

    expect(() =>
      cookiesArg.cookies.setAll([{ name: 'x', value: 'y', options: {} }])
    ).not.toThrow()
  })
})

describe('createAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    mockCreateClient.mockReturnValue('admin-client' as ReturnType<typeof createClient>)
  })

  it('calls createClient with the correct URL and service role key', async () => {
    const { createAdminClient } = await import('../server')
    createAdminClient()

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key'
    )
  })

  it('returns the client produced by createClient', async () => {
    const { createAdminClient } = await import('../server')
    const client = createAdminClient()

    expect(client).toBe('admin-client')
  })
})
