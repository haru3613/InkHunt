import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * HAR-666: page.test.tsx (if present) covers the logged-in list; this file
 * covers the logged-out redirect branch (lines 70-72 of page.tsx) — the
 * one uncovered path in ConsumerInquiriesPage.
 */

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next-intl', () => ({
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

  it('sends a logged-out visitor to LINE login and back to /inquiries, without fetching', async () => {
    render(<ConsumerInquiriesPage />)

    await waitFor(() => expect(loginWithRedirect).toHaveBeenCalledWith('/inquiries'))
    expect(global.fetch).not.toHaveBeenCalled()
    // Stays on the loading screen — never renders the inquiry list while redirecting.
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
