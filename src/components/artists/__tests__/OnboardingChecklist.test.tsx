import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingChecklist } from '../OnboardingChecklist'

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

describe('OnboardingChecklist', () => {
  it('renders all three checklist items', () => {
    render(
      <OnboardingChecklist
        hasProfile={false}
        portfolioCount={0}
        hasPricing={false}
      />,
    )

    expect(screen.getByText('基本資料已填寫')).toBeInTheDocument()
    expect(screen.getByText(/上傳至少 5 張作品/)).toBeInTheDocument()
    expect(screen.getByText('設定價格範圍')).toBeInTheDocument()
  })

  it('shows checkmark for completed items and circle for incomplete items', () => {
    render(
      <OnboardingChecklist
        hasProfile={true}
        portfolioCount={3}
        hasPricing={false}
      />,
    )

    const indicators = screen.getAllByText(/[✓○]/)
    const checkmarks = indicators.filter((el) => el.textContent === '✓')
    const circles = indicators.filter((el) => el.textContent === '○')

    expect(checkmarks).toHaveLength(1)
    expect(circles).toHaveLength(2)
  })

  it('incomplete profile item links to /artist/profile', () => {
    render(
      <OnboardingChecklist
        hasProfile={false}
        portfolioCount={0}
        hasPricing={false}
      />,
    )

    const profileLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/artist/profile')
    expect(profileLinks.length).toBeGreaterThan(0)
  })

  it('incomplete portfolio item links to /artist/portfolio', () => {
    render(
      <OnboardingChecklist
        hasProfile={false}
        portfolioCount={0}
        hasPricing={false}
      />,
    )

    const portfolioLink = screen
      .getAllByRole('link')
      .find((el) => el.getAttribute('href') === '/artist/portfolio')
    expect(portfolioLink).toBeDefined()
  })

  it('does not render links for completed items', () => {
    render(
      <OnboardingChecklist
        hasProfile={true}
        portfolioCount={5}
        hasPricing={true}
      />,
    )

    // artistSlug not provided so no preview link either
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('shows preview profile link when artistSlug is provided', () => {
    render(
      <OnboardingChecklist
        hasProfile={true}
        portfolioCount={5}
        hasPricing={true}
        artistSlug="my-artist"
      />,
    )

    const previewLink = screen.getByText('預覽我的 Profile').closest('a')
    expect(previewLink).toHaveAttribute('href', '/artists/my-artist')
  })

  it('does not show preview profile link when artistSlug is not provided', () => {
    render(
      <OnboardingChecklist
        hasProfile={true}
        portfolioCount={5}
        hasPricing={true}
      />,
    )

    expect(screen.queryByText('預覽我的 Profile')).not.toBeInTheDocument()
  })
})
