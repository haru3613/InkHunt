import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArtistPagination } from '../ArtistPagination'

/**
 * HAR-667: `/artists` has NO pagination UI — artists beyond the first page
 * (`DEFAULT_PAGE_SIZE`) are unreachable even though `getArtists` already
 * supports `page`/`pageSize`. This is the presentational pager: prev/next
 * links (preserving the current filters) + a page indicator, hidden entirely
 * when everything fits on one page.
 */

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const MESSAGES: Record<string, string> = {
  paginationLabel: '分頁',
  paginationPrev: '上一頁',
  paginationNext: '下一頁',
  paginationStatus: '第 {page} / {totalPages} 頁',
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const template = MESSAGES[key] ?? key
    if (!values) return template
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''))
  },
}))

describe('ArtistPagination (HAR-667)', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <ArtistPagination page={1} pageSize={12} total={12} searchParams={{}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there are zero results', () => {
    const { container } = render(
      <ArtistPagination page={1} pageSize={12} total={0} searchParams={{}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the page indicator "第 1 / 3 頁" for page 1 of 3', () => {
    render(<ArtistPagination page={1} pageSize={12} total={30} searchParams={{}} />)
    expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument()
  })

  it('disables Prev on page 1 (no link) and enables Next', () => {
    render(<ArtistPagination page={1} pageSize={12} total={30} searchParams={{}} />)
    expect(screen.queryByTestId('pagination-prev')).not.toBeInTheDocument()
    expect(screen.getByTestId('pagination-prev-disabled')).toBeInTheDocument()
    expect(screen.getByTestId('pagination-next')).toHaveAttribute('href', '/artists?page=2')
  })

  it('disables Next on the last page and enables Prev', () => {
    render(<ArtistPagination page={3} pageSize={12} total={30} searchParams={{}} />)
    expect(screen.queryByTestId('pagination-next')).not.toBeInTheDocument()
    expect(screen.getByTestId('pagination-next-disabled')).toBeInTheDocument()
    expect(screen.getByTestId('pagination-prev')).toHaveAttribute('href', '/artists?page=2')
  })

  it('omits ?page= for page 1 (the canonical unfiltered URL)', () => {
    render(<ArtistPagination page={2} pageSize={12} total={30} searchParams={{}} />)
    expect(screen.getByTestId('pagination-prev')).toHaveAttribute('href', '/artists')
  })

  it('preserves the other active filters in the prev/next hrefs', () => {
    render(
      <ArtistPagination
        page={2}
        pageSize={12}
        total={30}
        searchParams={{ style: 'traditional', sort: 'newest' }}
      />,
    )
    const next = screen.getByTestId('pagination-next').getAttribute('href')!
    const params = new URLSearchParams(next.split('?')[1])
    expect(params.get('style')).toBe('traditional')
    expect(params.get('sort')).toBe('newest')
    expect(params.get('page')).toBe('3')
  })
})
