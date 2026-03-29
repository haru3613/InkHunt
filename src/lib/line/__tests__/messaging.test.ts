import { describe, it, expect } from 'vitest'
import {
  buildInquiryNotificationMessage,
  buildQuoteNotificationMessage,
} from '../messaging'
import type { Inquiry } from '@/types/database'

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inquiry-123',
    artist_id: 'artist-1',
    consumer_line_id: 'U123',
    consumer_name: '小明',
    description: 'test description',
    reference_images: [],
    body_part: null,
    size_estimate: null,
    budget_min: null,
    budget_max: null,
    status: 'pending',
    quote_request_id: null,
    created_at: '2026-03-29T00:00:00Z',
    ...overrides,
  }
}

describe('buildInquiryNotificationMessage', () => {
  it('truncates long descriptions to 80 chars', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ description: 'A'.repeat(100) }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('A'.repeat(77) + '...')
  })

  it('does not truncate short descriptions', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ description: 'short desc' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('short desc')
    expect(textBody).not.toContain('short desc...')
  })

  it('includes deep link to dashboard with inquiry id', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ id: 'inquiry-456' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('inquiry=inquiry-456')
  })

  it('returns a flex message with type flex', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    expect(msg.type).toBe('flex')
  })

  it('includes consumer name', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ consumer_name: '大衛' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('大衛')
  })

  it('falls back to 匿名用戶 when no consumer name', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ consumer_name: null }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('匿名用戶')
  })

  it('includes body part when provided', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ body_part: '手臂' }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('手臂')
    expect(textBody).toContain('部位')
  })

  it('includes budget range when both min and max provided', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_min: 3000, budget_max: 8000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$3,000')
    expect(textBody).toContain('NT$8,000')
  })

  it('shows budget_min only with 起', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_min: 5000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$5,000 起')
  })

  it('shows budget_max only with 以內', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry({ budget_max: 10000 }),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$10,000 以內')
  })

  it('uses brass gold accent color', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#C8A97E')
  })

  it('uses dark theme background', () => {
    const msg = buildInquiryNotificationMessage(
      makeInquiry(),
      'http://localhost:3000',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#1A1A1A')
  })
})

describe('buildQuoteNotificationMessage', () => {
  it('formats price with NT$ prefix', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist Name',
      5000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$5,000')
  })

  it('includes artist name in the message', () => {
    const msg = buildQuoteNotificationMessage(
      'Tattoo Master',
      3000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('Tattoo Master')
  })

  it('includes link to inquiry detail page', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      5000,
      'http://localhost:3000',
      'inquiry-789',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('/inquiries/inquiry-789')
  })

  it('returns a flex message with type flex', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      1000,
      'http://localhost:3000',
      'inquiry-123',
    )
    expect(msg.type).toBe('flex')
  })

  it('uses brass gold accent color', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      1000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#C8A97E')
  })

  it('formats large prices with commas', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist',
      150000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$150,000')
  })
})
