import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * HAR-666: page.test.tsx (if present) covers the logged-in list; this file
 * covers the logged-out redirect branch (lines 70-72 of page.tsx) — the
 * one uncovered path in ConsumerInquiriesPage.
 */

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('next-intl', () => ({
  useLocale: () => 'zh-TW',
  useTranslations: () => (key: string) => key,
}))

const loginWithRedirect = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isLoading: false,
    loginWithRedirect,
  }),
}))

import ConsumerInquiriesPage from '../page'

describe('ConsumerInquiriesPage — logged-out redirect', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    loginWithRedirect.mockClear()
  })

  it('shows a guest login prompt without automatically redirecting or fetching', async () => {
    render(<ConsumerInquiriesPage />)

    expect(loginWithRedirect).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('把想法與回覆，留在同一個地方。')).toBeInTheDocument()
    await screen.getByRole('button', { name: '使用 LINE 登入' }).click()
    expect(loginWithRedirect).toHaveBeenCalledWith('/zh-TW/inquiries')
  })
})
