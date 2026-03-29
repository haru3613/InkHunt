import { describe, it, expect } from 'vitest'
import { updateArtistSchema } from '@/app/api/artists/[slug]/schema'

describe('updateArtistSchema — price_min / price_max cross-field validation', () => {
  it('passes when price_min < price_max', () => {
    const result = updateArtistSchema.safeParse({ price_min: 3000, price_max: 15000 })
    expect(result.success).toBe(true)
  })

  it('passes when price_min === price_max', () => {
    const result = updateArtistSchema.safeParse({ price_min: 5000, price_max: 5000 })
    expect(result.success).toBe(true)
  })

  it('fails when price_min > price_max', () => {
    const result = updateArtistSchema.safeParse({ price_min: 20000, price_max: 3000 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message)
      expect(messages).toContain('price_min must be less than or equal to price_max')
    }
  })

  it('passes when only price_min is provided (partial update)', () => {
    const result = updateArtistSchema.safeParse({ price_min: 5000 })
    expect(result.success).toBe(true)
  })

  it('passes when only price_max is provided (partial update)', () => {
    const result = updateArtistSchema.safeParse({ price_max: 10000 })
    expect(result.success).toBe(true)
  })

  it('passes when both price_min and price_max are undefined', () => {
    const result = updateArtistSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('passes when both price_min and price_max are null', () => {
    const result = updateArtistSchema.safeParse({ price_min: null, price_max: null })
    expect(result.success).toBe(true)
  })
})
