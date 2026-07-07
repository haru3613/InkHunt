import { describe, it, expect } from 'vitest'
import { isNewArtist, NEW_ARTIST_WINDOW_DAYS } from '../new-artist'

const NOW = new Date('2026-07-07T00:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString()
}

describe('isNewArtist (HAR-583)', () => {
  it('defaults the window to 30 days', () => {
    expect(NEW_ARTIST_WINDOW_DAYS).toBe(30)
  })

  it('is true for an artist created just now', () => {
    expect(isNewArtist(NOW.toISOString(), NOW)).toBe(true)
  })

  it('is true within the window', () => {
    expect(isNewArtist(daysAgo(NEW_ARTIST_WINDOW_DAYS - 1), NOW)).toBe(true)
  })

  it('is true at exactly the window boundary', () => {
    expect(isNewArtist(daysAgo(NEW_ARTIST_WINDOW_DAYS), NOW)).toBe(true)
  })

  it('is false once older than the window', () => {
    expect(isNewArtist(daysAgo(NEW_ARTIST_WINDOW_DAYS + 1), NOW)).toBe(false)
  })

  it('is false for an empty string (never throws)', () => {
    expect(isNewArtist('', NOW)).toBe(false)
  })

  it('is false for a malformed timestamp (never throws)', () => {
    expect(isNewArtist('not-a-date', NOW)).toBe(false)
  })

  it('honours a custom windowDays', () => {
    expect(isNewArtist(daysAgo(5), NOW, 7)).toBe(true)
    expect(isNewArtist(daysAgo(10), NOW, 7)).toBe(false)
  })
})
