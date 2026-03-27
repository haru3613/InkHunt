import { describe, it, expect } from 'vitest'
import { validateInquiryCreate } from '../inquiries'

describe('validateInquiryCreate', () => {
  it('accepts valid inquiry with all fields', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
      budget_min: 3000,
      budget_max: 8000,
      reference_images: ['https://example.com/ref1.jpg'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid inquiry with only required fields', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
    })
    expect(result.success).toBe(true)
  })

  it('rejects description under 10 chars', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'short',
      body_part: '手臂',
      size_estimate: '5cm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid artist_id (not UUID)', () => {
    const result = validateInquiryCreate({
      artist_id: 'not-a-uuid',
      description: 'I want a detailed sleeve tattoo design',
      body_part: '手臂（上臂）',
      size_estimate: '30x10 cm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid budget range (min > max)', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      body_part: '手臂（上臂）',
      size_estimate: '30x10 cm',
      budget_min: 10000,
      budget_max: 5000,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid budget range (min === max)', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 5000,
      budget_max: 5000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 3 reference images', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects description over 1000 chars', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing artist_id', () => {
    const result = validateInquiryCreate({
      description: 'I want a detailed sleeve tattoo design',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing description', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('defaults reference_images to empty array when not provided', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference_images).toEqual([])
    }
  })

  it('allows only budget_min without budget_max', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 3000,
    })
    expect(result.success).toBe(true)
  })

  it('allows only budget_max without budget_min', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_max: 8000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative budget values', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: -1000,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer budget values', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      budget_min: 3000.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects reference_images with invalid URLs', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      reference_images: ['not-a-url'],
    })
    expect(result.success).toBe(false)
  })
})
