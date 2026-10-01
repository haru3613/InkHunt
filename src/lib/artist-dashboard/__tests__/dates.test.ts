import { describe, expect, it } from 'vitest'
import { addDays, getTaipeiDate, getWeekStart, isValidDateKey } from '../dates'

describe('artist dashboard dates', () => {
  it('uses Taipei at UTC midnight and across the calendar year', () => {
    expect(getTaipeiDate(new Date('2026-12-31T15:59:59.999Z'))).toBe('2026-12-31')
    expect(getTaipeiDate(new Date('2026-12-31T16:00:00.000Z'))).toBe('2027-01-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('returns Monday for every selected weekday, including Sunday', () => {
    expect(getWeekStart('2026-03-30')).toBe('2026-03-30')
    expect(getWeekStart('2026-04-05')).toBe('2026-03-30')
  })

  it('rejects impossible calendar dates', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(isValidDateKey('2024-02-29')).toBe(true)
    expect(isValidDateKey('2026-2-01')).toBe(false)
  })
})
