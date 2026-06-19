import { describe, it, expect } from 'vitest'
import { reviewSchema, type ReviewInput } from '../review'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'

const validBase = {
  rating: 5,
  artistId: VALID_UUID,
}

// ---------------------------------------------------------------------------
// reviewSchema — valid inputs
// ---------------------------------------------------------------------------

describe('reviewSchema — valid inputs', () => {
  it('accepts required fields only (comment omitted)', () => {
    const result = reviewSchema.safeParse(validBase)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rating).toBe(5)
      expect(result.data.artistId).toBe(VALID_UUID)
      expect(result.data.comment).toBeUndefined()
    }
  })

  it('accepts a fully-populated valid payload with comment', () => {
    const result = reviewSchema.safeParse({
      ...validBase,
      rating: 4,
      comment: '師傅技術很好，溝通順暢，成品超出預期！',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comment).toBe('師傅技術很好，溝通順暢，成品超出預期！')
    }
  })

  it('trims surrounding whitespace from comment', () => {
    const result = reviewSchema.safeParse({
      ...validBase,
      comment: '  很棒的體驗  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comment).toBe('很棒的體驗')
    }
  })
})

// ---------------------------------------------------------------------------
// reviewSchema — rating validation
// ---------------------------------------------------------------------------

describe('reviewSchema — rating', () => {
  it('accepts rating exactly 1 (lower boundary)', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: 1 })

    expect(result.success).toBe(true)
  })

  it('accepts rating exactly 5 (upper boundary)', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: 5 })

    expect(result.success).toBe(true)
  })

  it('rejects rating of 0 (below minimum)', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: 0 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('rating')
    }
  })

  it('rejects rating of 6 (above maximum)', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: 6 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('rating')
    }
  })

  it('rejects a non-integer rating (e.g. 3.5)', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: 3.5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('rating')
    }
  })

  it('rejects a missing rating', () => {
    const result = reviewSchema.safeParse({ artistId: VALID_UUID })

    expect(result.success).toBe(false)
  })

  it('rejects a non-numeric rating', () => {
    const result = reviewSchema.safeParse({ ...validBase, rating: '5' })

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// reviewSchema — comment validation
// ---------------------------------------------------------------------------

describe('reviewSchema — comment', () => {
  it('accepts comment exactly 1000 characters (upper boundary)', () => {
    const result = reviewSchema.safeParse({
      ...validBase,
      comment: 'x'.repeat(1000),
    })

    expect(result.success).toBe(true)
  })

  it('rejects comment longer than 1000 characters', () => {
    const result = reviewSchema.safeParse({
      ...validBase,
      comment: 'x'.repeat(1001),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('comment')
    }
  })

  it('rejects a comment that exceeds the limit only after trimming is irrelevant (raw over-long still fails)', () => {
    // 1001 non-whitespace characters must fail even though no trimming applies
    const result = reviewSchema.safeParse({
      ...validBase,
      comment: 'a'.repeat(1001),
    })

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// reviewSchema — artistId validation
// ---------------------------------------------------------------------------

describe('reviewSchema — artistId', () => {
  it('rejects a non-UUID artistId string', () => {
    const result = reviewSchema.safeParse({ ...validBase, artistId: 'not-a-uuid' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('artistId')
    }
  })

  it('rejects a plain numeric string as artistId', () => {
    const result = reviewSchema.safeParse({ ...validBase, artistId: '123' })

    expect(result.success).toBe(false)
  })

  it('rejects a missing artistId', () => {
    const result = reviewSchema.safeParse({ rating: 5 })

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ReviewInput type — compile-time sanity (exercised by usage)
// ---------------------------------------------------------------------------

describe('ReviewInput type', () => {
  it('is assignable from a valid parsed payload', () => {
    const input: ReviewInput = {
      rating: 5,
      artistId: VALID_UUID,
      comment: 'great',
    }

    expect(input.rating).toBe(5)
  })
})
