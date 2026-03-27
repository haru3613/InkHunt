import { describe, it, expect } from 'vitest'
import {
  buildInquiryNotificationMessage,
  buildQuoteNotificationMessage,
} from '../messaging'

describe('buildInquiryNotificationMessage', () => {
  it('truncates long descriptions to 50 chars', () => {
    const msg = buildInquiryNotificationMessage(
      'A'.repeat(100),
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('A'.repeat(47) + '...')
  })

  it('does not truncate short descriptions', () => {
    const msg = buildInquiryNotificationMessage(
      'short desc',
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('short desc')
    expect(textBody).not.toContain('short desc...')
  })

  it('includes deep link to dashboard', () => {
    const msg = buildInquiryNotificationMessage(
      'test description',
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('/artist/dashboard')
  })

  it('includes inquiry id in the dashboard link', () => {
    const msg = buildInquiryNotificationMessage(
      'test',
      'http://localhost:3000',
      'inquiry-456',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('inquiry=inquiry-456')
  })

  it('returns a flex message with type flex', () => {
    const msg = buildInquiryNotificationMessage(
      'test',
      'http://localhost:3000',
      'inquiry-123',
    )
    expect(msg.type).toBe('flex')
  })

  it('includes altText with truncated description', () => {
    const msg = buildInquiryNotificationMessage(
      'A'.repeat(100),
      'http://localhost:3000',
      'inquiry-123',
    )
    expect(msg.altText).toContain('A'.repeat(44) + '...')
  })

  it('uses brass gold accent color for button', () => {
    const msg = buildInquiryNotificationMessage(
      'test',
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('#C8A97E')
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
