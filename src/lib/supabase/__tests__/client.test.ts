import { describe, it, expect, vi, beforeEach } from 'vitest'

// Top-level mock: replaces the module for the entire test file.
// The factory runs once; individual tests control the spy via mockReturnValue.
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
}))

// Helper: reset module registry, stub env vars, then dynamically re-import
// the client module so its top-level constants are re-evaluated with the
// new env values.
async function loadClientModule(env: {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
}) {
  vi.resetModules()

  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')

  return import('@/lib/supabase/client')
}

describe('isSupabaseConfigured', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns false when both env vars are empty strings', async () => {
    const { isSupabaseConfigured } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })

    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns false when only URL is set', async () => {
    const { isSupabaseConfigured } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })

    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns false when only anon key is set', async () => {
    const { isSupabaseConfigured } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
    })

    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns true when both env vars are non-empty', async () => {
    const { isSupabaseConfigured } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
    })

    expect(isSupabaseConfigured()).toBe(true)
  })
})

describe('createClient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws when Supabase is not configured', async () => {
    const { createClient } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })

    expect(() => createClient()).toThrow(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  })

  it('throws when only URL is missing', async () => {
    const { createClient } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
    })

    expect(() => createClient()).toThrow('Supabase is not configured.')
  })

  it('calls createBrowserClient with the correct URL and anon key', async () => {
    const expectedUrl = 'https://example.supabase.co'
    const expectedKey = 'anon-key-value'

    const { createClient } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: expectedUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: expectedKey,
    })

    // Re-import the (now re-registered) mock to get the current spy reference.
    const { createBrowserClient } = await import('@supabase/ssr')
    const spy = vi.mocked(createBrowserClient)
    spy.mockClear()

    createClient()

    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith(expectedUrl, expectedKey)
  })

  it('returns the value produced by createBrowserClient', async () => {
    const fakeClient = { from: vi.fn(), auth: { getUser: vi.fn() } }

    const { createClient } = await loadClientModule({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
    })

    const { createBrowserClient } = await import('@supabase/ssr')
    vi.mocked(createBrowserClient).mockReturnValueOnce(fakeClient as never)

    const result = createClient()

    expect(result).toBe(fakeClient)
  })
})
