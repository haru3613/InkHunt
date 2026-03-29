import { describe, it, expect } from 'vitest'
import { inquirySchema, BODY_PARTS } from '../inquiry'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validBase = {
  description: '我想在手臂上刺一個極簡線條的玫瑰圖案',
  body_part: '手臂（上臂）',
  size_estimate: '約 10 x 10 公分',
}

// ---------------------------------------------------------------------------
// inquirySchema — valid inputs
// ---------------------------------------------------------------------------

describe('inquirySchema — valid inputs', () => {
  it('accepts a fully-populated valid payload', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      budget_min: 3000,
      budget_max: 8000,
      reference_images: [
        'https://example.com/ref1.jpg',
        'https://example.com/ref2.jpg',
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts required fields only (omitting all optional fields)', () => {
    const result = inquirySchema.safeParse(validBase)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
      expect(result.data.budget_min).toBeUndefined()
      expect(result.data.budget_max).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// inquirySchema — description validation
// ---------------------------------------------------------------------------

describe('inquirySchema — description', () => {
  it('rejects description shorter than 10 characters', () => {
    const result = inquirySchema.safeParse({ ...validBase, description: '太短了' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('請至少描述 10 個字')
    }
  })

  it('rejects description longer than 1000 characters', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      description: 'x'.repeat(1001),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('描述不能超過 1000 字')
    }
  })

  it('accepts description exactly 10 characters long (boundary)', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      description: '一二三四五六七八九十',
    })

    expect(result.success).toBe(true)
  })

  it('accepts description exactly 1000 characters long (boundary)', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      description: 'x'.repeat(1000),
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// inquirySchema — body_part and size_estimate validation
// ---------------------------------------------------------------------------

describe('inquirySchema — body_part', () => {
  it('rejects empty body_part', () => {
    const result = inquirySchema.safeParse({ ...validBase, body_part: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('請選擇刺青部位')
    }
  })
})

describe('inquirySchema — size_estimate', () => {
  it('rejects empty size_estimate', () => {
    const result = inquirySchema.safeParse({ ...validBase, size_estimate: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('請填寫預計大小')
    }
  })
})

// ---------------------------------------------------------------------------
// inquirySchema — budget refinement
// ---------------------------------------------------------------------------

describe('inquirySchema — budget', () => {
  it('accepts when both budget_min and budget_max are provided and min < max', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      budget_min: 2000,
      budget_max: 6000,
    })

    expect(result.success).toBe(true)
  })

  it('accepts when only budget_min is provided', () => {
    const result = inquirySchema.safeParse({ ...validBase, budget_min: 2000 })

    expect(result.success).toBe(true)
  })

  it('accepts when only budget_max is provided', () => {
    const result = inquirySchema.safeParse({ ...validBase, budget_max: 6000 })

    expect(result.success).toBe(true)
  })

  it('rejects when budget_min exceeds budget_max', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      budget_min: 8000,
      budget_max: 3000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('最低預算不能超過最高預算')
    }
  })

  it('accepts when budget_min equals budget_max', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      budget_min: 5000,
      budget_max: 5000,
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// inquirySchema — reference_images
// ---------------------------------------------------------------------------

describe('inquirySchema — reference_images', () => {
  it('defaults reference_images to an empty array when omitted', () => {
    const result = inquirySchema.safeParse(validBase)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
    }
  })

  it('rejects when more than 3 reference images are provided', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      reference_images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('最多上傳 3 張參考圖')
    }
  })

  it('accepts exactly 3 reference images (boundary)', () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      reference_images: ['a.jpg', 'b.jpg', 'c.jpg'],
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// BODY_PARTS export
// ---------------------------------------------------------------------------

describe('BODY_PARTS', () => {
  it('is exported as a readonly tuple', () => {
    expect(Array.isArray(BODY_PARTS)).toBe(true)
  })

  it('contains exactly 13 items', () => {
    expect(BODY_PARTS).toHaveLength(13)
  })

  it('includes expected parts from the spec', () => {
    expect(BODY_PARTS).toContain('手臂（上臂）')
    expect(BODY_PARTS).toContain('手臂（前臂）')
    expect(BODY_PARTS).toContain('背部')
    expect(BODY_PARTS).toContain('其他')
  })
})
