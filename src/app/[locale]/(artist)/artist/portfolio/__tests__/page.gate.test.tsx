import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const authState = vi.hoisted(() => ({
  artist: null as null | { slug: string; id: string },
  isLoading: false,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import PortfolioPage from '../page'

describe('PortfolioPage non-artist gate (HAR-684)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.artist = null
    authState.isLoading = false
    global.fetch = vi.fn() as unknown as typeof fetch
  })

  it('does not get stuck on Loading for a non-artist user', () => {
    render(<PortfolioPage />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('shows a prompt linking to /artist for a non-artist user', () => {
    render(<PortfolioPage />)
    const cta = screen.getByRole('link')
    expect(cta).toHaveAttribute('href', '/artist')
  })

  it('does not fetch the portfolio for a non-artist user', () => {
    render(<PortfolioPage />)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still shows Loading while auth state is resolving', () => {
    authState.isLoading = true
    render(<PortfolioPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
