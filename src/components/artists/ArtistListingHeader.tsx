import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { hasPublicArtistCount } from '@/lib/public-supply'

interface ArtistListingHeaderProps {
  /** Total number of artists matching the current filters (from `getArtists`). */
  total: number
  /** Whether any listing filter is active — drives the 清除篩選 affordance. */
  hasActiveFilters: boolean
}

/**
 * Presentational header for the `/artists` listing (HAR-435 + cold-start):
 *
 * - a result-count line (`找到 {total} 位刺青師`),
 * - a `清除篩選` link to bare `/artists` whenever a filter is active, and
 * - empty-state: filtered-no-results vs cold-start (no supply yet).
 */
export function ArtistListingHeader({
  total,
  hasActiveFilters,
}: ArtistListingHeaderProps) {
  const t = useTranslations('artists')

  const clearLink = hasActiveFilters ? (
    <Link
      href="/artists"
      className="text-sm text-primary underline-offset-4 transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:underline"
    >
      {t('clearFilters')}
    </Link>
  ) : null

  const isColdStart = total === 0 && !hasActiveFilters
  const isFilteredEmpty = total === 0 && hasActiveFilters
  const showResultCount = hasPublicArtistCount(total) || isFilteredEmpty

  return (
    <div className="mb-4">
      {!isColdStart && (showResultCount || hasActiveFilters) ? (
        <div
          className={`flex items-center gap-3 ${showResultCount ? 'justify-between' : 'justify-end'}`}
        >
          {showResultCount ? (
            <p className="text-sm text-muted-foreground">
              {t('resultCount', { count: total })}
            </p>
          ) : null}
          {total > 0 ? clearLink : null}
        </div>
      ) : null}

      {isColdStart ? (
        <div
          data-testid="artists-cold-start"
          className="mt-6 flex flex-col items-center gap-3 rounded-md border border-border bg-card px-6 py-12 text-center"
        >
          <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-primary">
            {t('coldStartLabel')}
          </p>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t('coldStartTitle')}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('coldStartHelp')}
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/artist"
              className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-8 text-sm font-medium text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-accent-hover"
            >
              {t('coldStartCta')}
            </Link>
            <Link
              href="/#styles"
              className="inline-flex h-11 items-center justify-center rounded-sm border border-border px-8 text-sm font-medium text-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
            >
              {t('coldStartBrowseCta')}
            </Link>
          </div>
        </div>
      ) : null}

      {isFilteredEmpty ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t('emptyTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('emptyHelp')}</p>
          {clearLink}
        </div>
      ) : null}
    </div>
  )
}
