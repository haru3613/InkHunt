import { describe, it, expect } from 'vitest'
import { quoteRequestSchema } from '../quote-request'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_UUID_1 = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4901-bcde-f12345678901'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4012-8cde-123456789012'

const validBase = {
  artist_ids: [VALID_UUID_1],
  description: '我想在手臂刺一個幾何風格的圖案，大約拳頭大小',
  body_part: '手臂（前臂）',
  size_estimate: '約 8 x 8 公分',
}

// ---------------------------------------------------------------------------
// quoteRequestSchema — valid inputs
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — valid inputs', () => {
  it('accepts a fully-populated valid payload with all optional fields', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      artist_ids: [VALID_UUID_1, VALID_UUID_2],
      reference_images: [
        'https://example.com/ref1.jpg',
        'https://example.com/ref2.jpg',
      ],
      budget_min: 2000,
      budget_max: 6000,
    })

    expect(result.success).toBe(true)
  })

  it('accepts required fields only (omitting all optional fields)', () => {
    const result = quoteRequestSchema.safeParse(validBase)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
      expect(result.data.budget_min).toBeUndefined()
      expect(result.data.budget_max).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// quoteRequestSchema — artist_ids validation
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — artist_ids', () => {
  it('rejects an empty artist_ids array', () => {
    const result = quoteRequestSchema.safeParse({ ...validBase, artist_ids: [] })

    expect(result.success).toBe(false)
  })

  it('rejects more than 3 artist_ids', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      artist_ids: [VALID_UUID_1, VALID_UUID_2, VALID_UUID_3, 'd4e5f6a7-b8c9-4123-8def-234567890123'],
    })

    expect(result.success).toBe(false)
  })

  it('accepts exactly 3 artist_ids (boundary)', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      artist_ids: [VALID_UUID_1, VALID_UUID_2, VALID_UUID_3],
    })

    expect(result.success).toBe(true)
  })

  it('rejects non-UUID strings in artist_ids', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      artist_ids: ['not-a-uuid'],
    })

    expect(result.success).toBe(false)
  })

  it('rejects plain numeric strings in artist_ids', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      artist_ids: ['123'],
    })

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// quoteRequestSchema — description validation
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — description', () => {
  it('rejects description shorter than 10 characters', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      description: '短',
    })

    expect(result.success).toBe(false)
  })

  it('rejects description longer than 1000 characters', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      description: 'x'.repeat(1001),
    })

    expect(result.success).toBe(false)
  })

  it('accepts description exactly 10 characters (boundary)', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      description: '一二三四五六七八九十',
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// quoteRequestSchema — reference_images validation
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — reference_images', () => {
  it('defaults reference_images to an empty array when omitted', () => {
    const result = quoteRequestSchema.safeParse(validBase)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
    }
  })

  it('rejects more than 3 reference images', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      reference_images: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
      ],
    })

    expect(result.success).toBe(false)
  })

  it('rejects non-URL strings in reference_images', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      reference_images: ['not-a-url'],
    })

    expect(result.success).toBe(false)
  })

  it('accepts exactly 3 valid URLs (boundary)', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      reference_images: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ],
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// quoteRequestSchema — body_part and size_estimate
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — body_part', () => {
  it('rejects empty body_part', () => {
    const result = quoteRequestSchema.safeParse({ ...validBase, body_part: '' })

    expect(result.success).toBe(false)
  })
})

describe('quoteRequestSchema — size_estimate', () => {
  it('rejects empty size_estimate', () => {
    const result = quoteRequestSchema.safeParse({ ...validBase, size_estimate: '' })

    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// quoteRequestSchema — budget refinement
// ---------------------------------------------------------------------------

describe('quoteRequestSchema — budget', () => {
  it('accepts when both budget_min and budget_max are provided and min < max', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      budget_min: 1000,
      budget_max: 5000,
    })

    expect(result.success).toBe(true)
  })

  it('accepts when only budget_min is provided', () => {
    const result = quoteRequestSchema.safeParse({ ...validBase, budget_min: 1000 })

    expect(result.success).toBe(true)
  })

  it('accepts when only budget_max is provided', () => {
    const result = quoteRequestSchema.safeParse({ ...validBase, budget_max: 5000 })

    expect(result.success).toBe(true)
  })

  it('rejects when budget_min exceeds budget_max', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      budget_min: 8000,
      budget_max: 2000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Minimum budget cannot exceed maximum budget')
    }
  })

  it('accepts when budget_min equals budget_max', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      budget_min: 4000,
      budget_max: 4000,
    })

    expect(result.success).toBe(true)
  })

  it('rejects a non-integer budget value (e.g. 3.5)', () => {
    const result = quoteRequestSchema.safeParse({
      ...validBase,
      budget_min: 3.5,
    })

    expect(result.success).toBe(false)
  })
})
