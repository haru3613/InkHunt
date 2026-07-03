import { describe, it, expect } from 'vitest'
import { favoriteInputSchema } from '../favorite'

describe('favoriteInputSchema', () => {
  it('accepts a valid uuid artistId', () => {
    const result = favoriteInputSchema.safeParse({
      artistId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-uuid artistId', () => {
    const result = favoriteInputSchema.safeParse({ artistId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing artistId', () => {
    const result = favoriteInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a non-string artistId', () => {
    const result = favoriteInputSchema.safeParse({ artistId: 123 })
    expect(result.success).toBe(false)
  })
})
