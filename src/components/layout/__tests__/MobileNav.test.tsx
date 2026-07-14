import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * MobileNav wiring test (HAR-468): asserts the favorites/收藏 tab routes to the
 * real `/favorites` page. The locale prefix is applied by `@/i18n/navigation`'s
 * `Link` in production; here we mock it to a plain anchor so the href reflects
 * the route the component asks for.
 */

let mockPathname = '/'

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
  usePathname: () => mockPathname,
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { MobileNav } from '../MobileNav'

/** The tab labels are keyed by translation slug (mocked to echo the key). */
const activeLabels = () =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent)

describe('MobileNav', () => {
  beforeEach(() => {
    mockPathname = '/'
  })

  it('routes the favorites tab to /favorites', () => {
    render(<MobileNav />)
    const favLink = screen.getByText('favorites').closest('a')
    expect(favLink).not.toBeNull()
    expect(favLink).toHaveAttribute('href', '/favorites')
  })

  it('highlights only the artists destination on /artists', () => {
    mockPathname = '/artists'
    render(<MobileNav />)
    expect(activeLabels()).toEqual(['findArtist'])
  })

  it('highlights only the artists destination on a nested /artists route', () => {
    mockPathname = '/artists/some-slug'
    render(<MobileNav />)
    expect(activeLabels()).toEqual(['findArtist'])
  })

  it('highlights only the artist destination on /artist', () => {
    mockPathname = '/artist'
    render(<MobileNav />)
    expect(activeLabels()).toEqual(['artist'])
  })

  it('highlights only the artist destination on a nested /artist route', () => {
    mockPathname = '/artist/dashboard'
    render(<MobileNav />)
    expect(activeLabels()).toEqual(['artist'])
  })

  it('highlights only home on /', () => {
    mockPathname = '/'
    render(<MobileNav />)
    expect(activeLabels()).toEqual(['home'])
  })
})
