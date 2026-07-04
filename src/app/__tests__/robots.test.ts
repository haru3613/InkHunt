import { describe, expect, it, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('robots', () => {
  it('uses the production ink-hunt.com sitemap by default', async () => {
    const { default: robots } = await import('../robots')

    expect(robots().sitemap).toBe('https://ink-hunt.com/sitemap.xml')
  })
})
