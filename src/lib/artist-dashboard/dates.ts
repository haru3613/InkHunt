const TAIPEI_TIME_ZONE = 'Asia/Taipei'

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

/** Returns a calendar date in the product's single operating timezone. */
export function getTaipeiDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIPEI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

/** Adds whole calendar days without crossing a daylight-saving boundary. */
export function addDays(dateKey: string, days: number): string {
  if (!isValidDateKey(dateKey)) throw new Error(`Invalid date key: ${dateKey}`)
  const [year, month, day] = dateKey.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return result.toISOString().slice(0, 10)
}

/** Monday of the ISO week containing the supplied calendar date. */
export function getWeekStart(dateKey: string): string {
  if (!isValidDateKey(dateKey)) throw new Error(`Invalid date key: ${dateKey}`)
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(dateKey, weekday === 0 ? -6 : 1 - weekday)
}

export function taipeiStartOfDay(dateKey: string): string {
  if (!isValidDateKey(dateKey)) throw new Error(`Invalid date key: ${dateKey}`)
  return `${dateKey}T00:00:00+08:00`
}
