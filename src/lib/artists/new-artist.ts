/**
 * Freshness window for the「新加入」/「New」discovery badge (HAR-583). An artist
 * whose `created_at` falls within this many days of now is surfaced as new, so a
 * freshly-approved artist with 0 reviews + 0 saves still shows a positive signal
 * on the discovery card. `created_at` = onboarding-start time — a faithful "new"
 * proxy for v0.12-onboarded artists; a precise `approved_at` column is a possible
 * Wave-2 refinement, deliberately out of scope here.
 */
export const NEW_ARTIST_WINDOW_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * True when `createdAt` is within `windowDays` of `now`. Pure and total: returns
 * false (never throws) for a missing or unparseable timestamp, and false once the
 * artist is older than the window.
 */
export function isNewArtist(
  createdAt: string,
  now: Date = new Date(),
  windowDays: number = NEW_ARTIST_WINDOW_DAYS,
): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Math.abs(now.getTime() - created) <= windowDays * DAY_MS
}
