import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

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

describe('Footer', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders copyright notice with InkHunt brand name', async () => {
    const { Footer } = await import('../Footer')
    render(<Footer />)
    const copyright = screen.getByText(/InkHunt/)
    expect(copyright).toBeInTheDocument()
  })

  it('renders navigation links for about, privacy, and terms', async () => {
    const { Footer } = await import('../Footer')
    render(<Footer />)

    const nav = screen.getByRole('navigation', { name: 'Footer links' })
    expect(nav).toBeInTheDocument()

    const links = nav.querySelectorAll('a')
    expect(links).toHaveLength(3)

    const hrefs = Array.from(links).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/about')
    expect(hrefs).toContain('/privacy')
    expect(hrefs).toContain('/terms')
  })

  it('uses translated labels for navigation links', async () => {
    const { Footer } = await import('../Footer')
    render(<Footer />)

    // useTranslations mock returns the key itself, so we expect the i18n key strings
    expect(screen.getByText('about')).toBeInTheDocument()
    expect(screen.getByText('privacy')).toBeInTheDocument()
    expect(screen.getByText('terms')).toBeInTheDocument()
  })
})
