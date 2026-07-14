import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('../AuthSection', () => ({
  AuthSection: ({ loginLabel }: { loginLabel: string }) => (
    <div data-testid="auth-section">{loginLabel}</div>
  ),
}))

describe('Header', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders InkHunt logo link', async () => {
    const { Header } = await import('../Header')
    const HeaderResolved = await Header()
    render(HeaderResolved)
    expect(screen.getByText('InkHunt')).toBeInTheDocument()
    expect(screen.getByText('InkHunt').closest('a')).toHaveAttribute('href', '/')
  })

  it('renders AuthSection with login label', async () => {
    const { Header } = await import('../Header')
    const HeaderResolved = await Header()
    render(HeaderResolved)
    expect(screen.getByTestId('auth-section')).toBeInTheDocument()
  })

  it('renders the 成為刺青師 apply CTA linking to the artist entry', async () => {
    // getTranslations mock echoes the key, so the CTA label is the i18n key.
    const { Header } = await import('../Header')
    const HeaderResolved = await Header()
    render(HeaderResolved)
    const cta = screen.getByText('becomeArtist')
    expect(cta.closest('a')).toHaveAttribute('href', '/artist')
  })

  // HAR-595: desktop nav needs an entry point back to the consumer's saved list.
  it('routes the 我的收藏 link to /favorites', async () => {
    const { Header } = await import('../Header')
    const HeaderResolved = await Header()
    render(HeaderResolved)
    const favLink = screen.getByText('favorites').closest('a')
    expect(favLink).not.toBeNull()
    expect(favLink).toHaveAttribute('href', '/favorites')
  })
})
