import { describe, it, expect, vi, afterEach } from 'vitest'
import { missingEnvVars, assertServerEnv, REQUIRED_SERVER_ENV } from '../env'

function fullEnv(): Record<string, string> {
  return Object.fromEntries(REQUIRED_SERVER_ENV.map((k) => [k, 'x']))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('missingEnvVars', () => {
  it('returns empty array when all required vars are set', () => {
    expect(missingEnvVars(fullEnv())).toEqual([])
  })

  it('lists every missing or empty var', () => {
    const env = fullEnv()
    delete env.SUPABASE_SERVICE_ROLE_KEY
    env.LINE_CHANNEL_SECRET = ''
    expect(missingEnvVars(env)).toEqual([
      'SUPABASE_SERVICE_ROLE_KEY',
      'LINE_CHANNEL_SECRET',
    ])
  })
})

describe('assertServerEnv', () => {
  it('does not throw when all vars present', () => {
    expect(() => assertServerEnv({ ...fullEnv(), NODE_ENV: 'production' })).not.toThrow()
  })

  it('throws in production listing the missing vars', () => {
    const env: Record<string, string | undefined> = { ...fullEnv(), NODE_ENV: 'production' }
    delete env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => assertServerEnv(env)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('warns instead of throwing outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env: Record<string, string | undefined> = { ...fullEnv(), NODE_ENV: 'development' }
    delete env.LINE_CHANNEL_ID
    expect(() => assertServerEnv(env)).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('LINE_CHANNEL_ID'))
  })
})
