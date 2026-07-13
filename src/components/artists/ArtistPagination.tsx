import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface ArtistPaginationProps {
  /** Current 1-based page (mirrors `ArtistFilters.page`, HAR-667). */
  readonly page: number
  readonly pageSize: number
  /** Total matching artists across ALL pages (from `getArtists`). */
  readonly total: number
  /** Current `/artists` query params — carried over into the prev/next links
   *  (minus `page`, which is re-derived per link) so filters survive paging. */
  readonly searchParams: Readonly<Record<string, string | undefined>>
}

function buildHref(
  searchParams: Readonly<Record<string, string | undefined>>,
  page: number,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || !value) continue
    params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/artists?${qs}` : '/artists'
}

/**
 * Prev/Next pager for the `/artists` listing (HAR-667). Presentational +
 * pure link-building — no client state, so it stays a plain server component
 * (same pattern as `ArtistListingHeader`). Renders nothing when the result
 * set fits on a single page.
 */
export function ArtistPagination({ page, pageSize, total, searchParams }: ArtistPaginationProps) {
  const t = useTranslations('artists')
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (totalPages <= 1) return null

  const prevHref = page > 1 ? buildHref(searchParams, page - 1) : null
  const nextHref = page < totalPages ? buildHref(searchParams, page + 1) : null

  return (
    <nav
      aria-label={t('paginationLabel')}
      className="mt-6 flex items-center justify-center gap-4"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          data-testid="pagination-prev"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('paginationPrev')}
        </Link>
      ) : (
        <span data-testid="pagination-prev-disabled" className="text-sm text-muted-foreground">
          {t('paginationPrev')}
        </span>
      )}

      <span className="text-sm text-muted-foreground" data-testid="pagination-status">
        {t('paginationStatus', { page, totalPages })}
      </span>

      {nextHref ? (
        <Link
          href={nextHref}
          data-testid="pagination-next"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t('paginationNext')}
        </Link>
      ) : (
        <span data-testid="pagination-next-disabled" className="text-sm text-muted-foreground">
          {t('paginationNext')}
        </span>
      )}
    </nav>
  )
}
