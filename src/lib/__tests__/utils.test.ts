import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatPrice,
  formatPriceRange,
  truncate,
  formatRelativeTime,
  getInitials,
  formatIgUrl,
} from '@/lib/utils'

describe('formatPrice', () => {
  it('formats a basic amount', () => {
    expect(formatPrice(3000)).toBe('NT$3,000')
  })

  it('formats large numbers with commas', () => {
    expect(formatPrice(20000)).toBe('NT$20,000')
  })

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('NT$0')
  })
})

describe('formatPriceRange', () => {
  it('returns null when both min and max are null', () => {
    expect(formatPriceRange(null, null)).toBeNull()
  })

  it('returns null when both min and max are undefined', () => {
    expect(formatPriceRange(undefined, undefined)).toBeNull()
  })

  it('returns a range string when both min and max are set', () => {
    expect(formatPriceRange(3000, 20000)).toBe('NT$3,000~NT$20,000')
  })

  it('returns "起" format when only min is set', () => {
    expect(formatPriceRange(3000, null)).toBe('NT$3,000 起')
  })

  it('returns "起" format when min is set and max is undefined', () => {
    expect(formatPriceRange(3000, undefined)).toBe('NT$3,000 起')
  })

  it('returns "最高" format when only max is set', () => {
    expect(formatPriceRange(null, 20000)).toBe('最高 NT$20,000')
  })

  it('returns "最高" format when min is undefined and max is set', () => {
    expect(formatPriceRange(undefined, 20000)).toBe('最高 NT$20,000')
  })
})

describe('truncate', () => {
  it('returns the text unchanged when shorter than maxLen', () => {
    expect(truncate('短文字', 10)).toBe('短文字')
  })

  it('returns the text unchanged when exactly equal to maxLen', () => {
    expect(truncate('abcde', 5)).toBe('abcde')
  })

  it('truncates and appends "..." when text exceeds maxLen', () => {
    expect(truncate('abcdefghij', 7)).toBe('abcd...')
  })

  it('truncates a longer string correctly', () => {
    const text = 'This is a very long description that should be truncated'
    const result = truncate(text, 20)
    expect(result).toBe('This is a very lo...')
    expect(result.length).toBe(20)
  })
})

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "剛剛" for times less than 1 minute ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const thirtySecondsAgo = new Date(now.getTime() - 30_000).toISOString()
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('剛剛')
  })

  it('returns minutes format for times 1–59 minutes ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const fortyMinutesAgo = new Date(now.getTime() - 40 * 60_000).toISOString()
    expect(formatRelativeTime(fortyMinutesAgo)).toBe('40 分鐘前')
  })

  it('returns hours format for times 1–23 hours ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 小時前')
  })

  it('returns "昨天" for exactly 1 day ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(oneDayAgo)).toBe('昨天')
  })

  it('returns days format for times 2–6 days ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(fiveDaysAgo)).toBe('5 天前')
  })

  it('returns a localised date string for times 7+ days ago', () => {
    vi.useFakeTimers()
    const now = new Date('2026-03-29T12:00:00.000Z')
    vi.setSystemTime(now)
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60_000).toISOString()
    const result = formatRelativeTime(tenDaysAgo)
    // Should be a date string, not a relative label
    expect(result).not.toContain('前')
    expect(result).not.toBe('昨天')
    expect(result).not.toBe('剛剛')
  })
})

describe('getInitials', () => {
  it('returns first character of first and last word for a two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns first two characters for a single word name', () => {
    expect(getInitials('Harvey')).toBe('HA')
  })

  it('uses first and last word initials for names with more than two words', () => {
    expect(getInitials('John Michael Doe')).toBe('JD')
  })

  it('trims leading and trailing whitespace before splitting', () => {
    expect(getInitials('  Jane Smith  ')).toBe('JS')
  })
})

describe('formatIgUrl', () => {
  it('returns a full Instagram URL for a valid handle without @', () => {
    expect(formatIgUrl('inkhunt_tw')).toBe('https://instagram.com/inkhunt_tw')
  })

  it('strips the @ prefix and returns a valid URL', () => {
    expect(formatIgUrl('@inkhunt_tw')).toBe('https://instagram.com/inkhunt_tw')
  })

  it('returns null for a handle with invalid characters', () => {
    expect(formatIgUrl('invalid handle!')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(formatIgUrl('')).toBeNull()
  })

  it('returns null for a handle exceeding the maximum length', () => {
    // 31 characters after stripping @, over the 30-char limit enforced by the regex
    const longHandle = '@' + 'a'.repeat(31)
    expect(formatIgUrl(longHandle)).toBeNull()
  })
})
