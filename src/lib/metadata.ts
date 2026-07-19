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
    languages: {
      'zh-TW': `${SITE_URL}/zh-TW${normalizedPath}`,
      en: `${SITE_URL}/en${normalizedPath}`,
    },
  }
}
