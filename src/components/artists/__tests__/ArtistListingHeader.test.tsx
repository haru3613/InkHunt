import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArtistListingHeader } from '../ArtistListingHeader'

// `@/i18n/navigation` Link -> plain anchor (same stub style as
// OnboardingChecklist.test.tsx) so we can assert href.
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

// Mirror the real zh-TW `artists` messages this component reads so the test
// asserts the literal acceptance copy from the ticket, not a key passthrough.
const MESSAGES: Record<string, string> = {
  resultCount: '找到 {count} 位刺青師',
  emptyTitle: '找不到符合條件的刺青師',
  emptyHelp: '試著放寬風格、地區或預算',
  clearFilters: '清除篩選',
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const template = MESSAGES[key] ?? key
    if (!values) return template
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''))
  },
}))

describe('ArtistListingHeader (HAR-435)', () => {
  it('renders the result count "找到 12 位刺青師" and NO empty-state when total = 12', () => {
    render(<ArtistListingHeader total={12} hasActiveFilters={false} />)

    expect(screen.getByText('找到 12 位刺青師')).toBeInTheDocument()
    expect(screen.queryByText('找不到符合條件的刺青師')).not.toBeInTheDocument()
  })

  it('renders the empty-state copy when total = 0', () => {
    render(<ArtistListingHeader total={0} hasActiveFilters={false} />)

    expect(screen.getByText('找不到符合條件的刺青師')).toBeInTheDocument()
    expect(screen.getByText('試著放寬風格、地區或預算')).toBeInTheDocument()
  })

  it('still shows a count line at total = 0', () => {
    render(<ArtistListingHeader total={0} hasActiveFilters={false} />)
    expect(screen.getByText('找到 0 位刺青師')).toBeInTheDocument()
  })

  it('renders a 清除篩選 link to /artists when a filter is active', () => {
    render(<ArtistListingHeader total={3} hasActiveFilters={true} />)

    const link = screen.getByText('清除篩選').closest('a')
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute('href', '/artists')
  })

  it('does NOT render a 清除篩選 link when no filter is active', () => {
    render(<ArtistListingHeader total={3} hasActiveFilters={false} />)
    expect(screen.queryByText('清除篩選')).not.toBeInTheDocument()
  })

  it('offers 清除篩選 inside the empty-state so a zero-result filtered view can reset', () => {
    render(<ArtistListingHeader total={0} hasActiveFilters={true} />)

    expect(screen.getByText('找不到符合條件的刺青師')).toBeInTheDocument()
    const link = screen.getByText('清除篩選').closest('a')
    expect(link).toHaveAttribute('href', '/artists')
  })
})
