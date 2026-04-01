import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLiff = {
  init: vi.fn(),
  isLoggedIn: vi.fn(),
  login: vi.fn(),
  getIDToken: vi.fn(),
  isInClient: vi.fn(),
}
vi.mock('@line/liff', () => ({ default: mockLiff }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('initLiff', () => {
  it('throws when NEXT_PUBLIC_LINE_LIFF_ID is not set', async () => {
    const { initLiff } = await import('../liff')
    await expect(initLiff()).rejects.toThrow('NEXT_PUBLIC_LINE_LIFF_ID is not configured')
  })

  it('calls liff.init with the configured liffId', async () => {
    vi.stubEnv('NEXT_PUBLIC_LINE_LIFF_ID', 'test-liff-id')
    mockLiff.init.mockResolvedValue(undefined)

    const { initLiff } = await import('../liff')
    await initLiff()

    expect(mockLiff.init).toHaveBeenCalledOnce()
    expect(mockLiff.init).toHaveBeenCalledWith({ liffId: 'test-liff-id' })
  })

  it('returns the liff object on success', async () => {
    vi.stubEnv('NEXT_PUBLIC_LINE_LIFF_ID', 'test-liff-id')
    mockLiff.init.mockResolvedValue(undefined)

    const { initLiff } = await import('../liff')
    const result = await initLiff()

    expect(result).toBe(mockLiff)
  })

  it('skips liff.init on the second call (already initialized)', async () => {
    vi.stubEnv('NEXT_PUBLIC_LINE_LIFF_ID', 'test-liff-id')
    mockLiff.init.mockResolvedValue(undefined)

    const { initLiff } = await import('../liff')
    await initLiff()
    await initLiff()

    expect(mockLiff.init).toHaveBeenCalledOnce()
  })
})

describe('liffLogin', () => {
  it('calls login() and returns null when not logged in', async () => {
    vi.stubEnv('NEXT_PUBLIC_LINE_LIFF_ID', 'test-liff-id')
    mockLiff.init.mockResolvedValue(undefined)
    mockLiff.isLoggedIn.mockReturnValue(false)

    const { liffLogin } = await import('../liff')
    const result = await liffLogin()

    expect(mockLiff.login).toHaveBeenCalledOnce()
    expect(result).toBeNull()
  })

  it('returns the ID token when already logged in', async () => {
    vi.stubEnv('NEXT_PUBLIC_LINE_LIFF_ID', 'test-liff-id')
    mockLiff.init.mockResolvedValue(undefined)
    mockLiff.isLoggedIn.mockReturnValue(true)
    mockLiff.getIDToken.mockReturnValue('id-token-abc')

    const { liffLogin } = await import('../liff')
    const result = await liffLogin()

    expect(mockLiff.login).not.toHaveBeenCalled()
    expect(result).toBe('id-token-abc')
  })
})

describe('isInLiff', () => {
  it('returns true when liff.isInClient() is true', async () => {
    mockLiff.isInClient.mockReturnValue(true)

    const { isInLiff } = await import('../liff')
    expect(isInLiff()).toBe(true)
  })

  it('returns false when liff.isInClient() is false', async () => {
    mockLiff.isInClient.mockReturnValue(false)

    const { isInLiff } = await import('../liff')
    expect(isInLiff()).toBe(false)
  })
})
