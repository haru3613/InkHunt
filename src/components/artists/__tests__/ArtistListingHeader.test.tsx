import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArtistListingHeader } from '../ArtistListingHeader'

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
    <a href={typeof href === 'string' ? href : '/'} {...props}>
      {children}
    </a>
  ),
}))

const MESSAGES: Record<string, string> = {
  resultCount: '找到 {count} 位刺青師',
  emptyTitle: '找不到符合條件的刺青師',
  emptyHelp: '試著放寬風格、地區或預算',
  clearFilters: '清除篩選',
  coldStartLabel: '即將開放',
  coldStartTitle: '刺青師即將上線',
  coldStartHelp: '平台正在冷啟動。',
  coldStartCta: '成為刺青師',
  coldStartBrowseCta: '逛逛風格介紹',
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const template = MESSAGES[key] ?? key
    if (!values) return template
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''))
  },
}))

describe('ArtistListingHeader (HAR-435 + cold-start)', () => {
  it('renders the result count when total > 0', () => {
    render(<ArtistListingHeader total={12} hasActiveFilters={false} />)

    expect(screen.getByText('找到 12 位刺青師')).toBeInTheDocument()
    expect(screen.queryByTestId('artists-cold-start')).not.toBeInTheDocument()
  })

  it('hides low-supply result counts below the public threshold', () => {
    render(<ArtistListingHeader total={2} hasActiveFilters={false} />)

    expect(screen.queryByText('找到 2 位刺青師')).not.toBeInTheDocument()
    expect(screen.queryByTestId('artists-cold-start')).not.toBeInTheDocument()
  })

  it('shows the result count at the public threshold', () => {
    render(<ArtistListingHeader total={3} hasActiveFilters={false} />)

    expect(screen.getByText('找到 3 位刺青師')).toBeInTheDocument()
  })

  it('shows cold-start invite when total = 0 and no filters', () => {
    render(<ArtistListingHeader total={0} hasActiveFilters={false} />)

    expect(screen.getByTestId('artists-cold-start')).toBeInTheDocument()
    expect(screen.getByText('刺青師即將上線')).toBeInTheDocument()
    expect(screen.getByText('成為刺青師').closest('a')).toHaveAttribute(
      'href',
      '/artist',
    )
    expect(screen.getByText('逛逛風格介紹').closest('a')).toHaveAttribute(
      'href',
      '/#styles',
    )
    // Do not show the filtered empty copy or "找到 0 位"
    expect(screen.queryByText('找不到符合條件的刺青師')).not.toBeInTheDocument()
    expect(screen.queryByText('找到 0 位刺青師')).not.toBeInTheDocument()
  })

  it('shows filtered empty state when total = 0 with active filters', () => {
    render(<ArtistListingHeader total={0} hasActiveFilters={true} />)

    expect(screen.getByText('找不到符合條件的刺青師')).toBeInTheDocument()
    expect(screen.getByText('試著放寬風格、地區或預算')).toBeInTheDocument()
    expect(screen.getByText('清除篩選').closest('a')).toHaveAttribute(
      'href',
      '/artists',
    )
    expect(screen.queryByTestId('artists-cold-start')).not.toBeInTheDocument()
  })

  it('renders 清除篩選 when filters active and results exist', () => {
    render(<ArtistListingHeader total={3} hasActiveFilters={true} />)

    expect(screen.getByText('清除篩選').closest('a')).toHaveAttribute(
      'href',
      '/artists',
    )
  })

  it('does NOT render 清除篩選 when no filter is active', () => {
    render(<ArtistListingHeader total={3} hasActiveFilters={false} />)
    expect(screen.queryByText('清除篩選')).not.toBeInTheDocument()
  })
})
