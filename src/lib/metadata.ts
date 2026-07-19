import { routing } from '@/i18n/routing'

const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ink-hunt.com'
).replace(/\/$/, '')

function normalizePath(path: string): string {
  if (!path || path === '/') return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function buildLocalizedAlternates(locale: string, path: string) {
  const normalizedPath = normalizePath(path)

  return {
    canonical: `${SITE_URL}/${locale}${normalizedPath}`,
    languages: Object.fromEntries(
      routing.locales.map((supportedLocale) => [
        supportedLocale,
        `${SITE_URL}/${supportedLocale}${normalizedPath}`,
      ]),
    ),
  }
}
