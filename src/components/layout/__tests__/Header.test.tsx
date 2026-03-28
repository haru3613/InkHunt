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
})
