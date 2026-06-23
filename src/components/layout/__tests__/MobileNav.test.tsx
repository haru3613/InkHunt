import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * MobileNav wiring test (HAR-468): asserts the favorites/收藏 tab routes to the
 * real `/favorites` page. The locale prefix is applied by `@/i18n/navigation`'s
 * `Link` in production; here we mock it to a plain anchor so the href reflects
 * the route the component asks for.
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
  usePathname: () => '/',
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { MobileNav } from '../MobileNav'

describe('MobileNav', () => {
  it('routes the favorites tab to /favorites', () => {
    render(<MobileNav />)
    const favLink = screen.getByText('favorites').closest('a')
    expect(favLink).not.toBeNull()
    expect(favLink).toHaveAttribute('href', '/favorites')
  })
})
