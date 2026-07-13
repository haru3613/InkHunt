import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// HAR-663: branded 404 replacing Next's default English not-found screen.
// not-found.tsx is an async Server Component with no route params, so it
// reads the locale via next-intl/server's getLocale (per-repo pattern for
// mocking next-intl/server, see .mc/learnings.md).
vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => 'zh-TW'),
  getTranslations: vi.fn(async () => (key: string) => key),
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

describe('LocaleNotFound (src/app/[locale]/not-found.tsx)', () => {
  it('renders the branded 404 copy instead of the Next.js default screen', async () => {
    const { default: NotFound } = await import('../not-found')
    render(await NotFound())

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('description')).toBeInTheDocument()
  })

  it('offers a link back home', async () => {
    const { default: NotFound } = await import('../not-found')
    render(await NotFound())

    const homeLink = screen.getByRole('link', { name: 'goHome' })
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
