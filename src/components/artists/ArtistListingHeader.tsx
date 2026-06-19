import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface ArtistListingHeaderProps {
  /** Total number of artists matching the current filters (from `getArtists`). */
  total: number
  /** Whether any listing filter is active — drives the 清除篩選 affordance. */
  hasActiveFilters: boolean
}

/**
 * Presentational header for the `/artists` listing (HAR-435):
 *
 * - a result-count line (`找到 {total} 位刺青師`),
 * - a `清除篩選` link to bare `/artists` whenever a filter is active, and
 * - a graceful empty-state block when `total === 0`.
 *
 * Purely presentational — no query/filter logic. The "any filter active" signal
 * is computed by the page (`hasActiveListingFilters`) and passed in, so this
 * stays a unit-testable component.
 */
export function ArtistListingHeader({ total, hasActiveFilters }: ArtistListingHeaderProps) {
  const t = useTranslations('artists')

  const clearLink = hasActiveFilters ? (
    <Link href="/artists" className="text-sm text-primary underline-offset-4 hover:underline">
      {t('clearFilters')}
    </Link>
  ) : null

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('resultCount', { count: total })}</p>
        {total > 0 ? clearLink : null}
      </div>

      {total === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">{t('emptyTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('emptyHelp')}</p>
          {clearLink}
        </div>
      ) : null}
    </div>
  )
}
