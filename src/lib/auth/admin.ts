/**
 * Edge-safe admin helpers (no Node-only imports).
 * Used by middleware (Edge) and Node route handlers.
 */

const ARTIST_DASHBOARD_SEGMENTS =
  'dashboard|profile|portfolio|calendar|clients|settings|stats|onboarding|inquiries'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Parse ADMIN_LINE_USER_IDS env (comma-separated, trimmed). */
export function parseAdminLineUserIds(
  envValue: string | undefined = process.env.ADMIN_LINE_USER_IDS,
): string[] {
  return (envValue ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdmin(
  lineUserId: string,
  envValue: string | undefined = process.env.ADMIN_LINE_USER_IDS,
): boolean {
  if (!lineUserId) return false
  return parseAdminLineUserIds(envValue).includes(lineUserId)
}

/**
 * Match paths like /admin, /zh-TW/admin, /en/admin (and nested).
 * Locales may include mixed case (zh-TW).
 */
export function isAdminPath(
  pathname: string,
  locales: readonly string[],
): boolean {
  const localeAlt = locales.map(escapeRegex).join('|')
  const re = new RegExp(`^(?:/(?:${localeAlt}))?/admin(?:/|$)`)
  return re.test(pathname)
}

/**
 * Match protected artist dashboard routes with optional locale prefix.
 */
export function isProtectedArtistPath(
  pathname: string,
  locales: readonly string[],
): boolean {
  const localeAlt = locales.map(escapeRegex).join('|')
  const re = new RegExp(
    `^(?:/(?:${localeAlt}))?/artist/(?:${ARTIST_DASHBOARD_SEGMENTS})(?:/|$)`,
  )
  return re.test(pathname)
}

/** Preserve locale prefix when redirecting (e.g. /zh-TW/admin → /zh-TW/forbidden). */
export function withLocalePrefix(
  pathname: string,
  targetPath: string,
  locales: readonly string[],
): string {
  for (const locale of locales) {
    const prefix = `/${locale}`
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return `${prefix}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`
    }
  }
  return targetPath.startsWith('/') ? targetPath : `/${targetPath}`
}
