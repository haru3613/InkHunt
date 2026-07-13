import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

// --- Mocks (declared before component import) ---

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inq_1' }),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh-TW',
}))

const authState = vi.hoisted(() => ({
  user: null as null | { lineUserId: string },
  isLoggedIn: false,
  isLoading: false,
  loginWithRedirect: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/components/chat/ChatWindow', () => ({
  ChatWindow: () => <div data-testid="chat-window" />,
}))

import ConsumerChatPage from '../page'

describe('ConsumerChatPage auth gate + mobile layout (HAR-684)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    authState.user = null
    authState.isLoggedIn = false
    authState.isLoading = false
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        inquiry: { id: 'inq_1', status: 'pending' },
        artist: { display_name: 'Ink Master' },
      }),
    })) as unknown as typeof fetch
  })

  it('redirects a logged-out user to LINE login with the chat URL preserved', async () => {
    render(<ConsumerChatPage />)
    await waitFor(() =>
      expect(authState.loginWithRedirect).toHaveBeenCalledWith('/zh-TW/inquiries/inq_1'),
    )
  })

  it('renders a visible fallback (not a blank page) while logged out', () => {
    const { container } = render(<ConsumerChatPage />)
    expect(container.textContent?.trim()).not.toBe('')
  })

  it('does not redirect while auth state is still loading', () => {
    authState.isLoading = true
    render(<ConsumerChatPage />)
    expect(authState.loginWithRedirect).not.toHaveBeenCalled()
  })

  it('does not use h-screen for the chat container (mobile: header + MobileNav offsets)', async () => {
    authState.user = { lineUserId: 'U_test' }
    authState.isLoggedIn = true
    const { container } = render(<ConsumerChatPage />)
    await waitFor(() => expect(screen.getByTestId('chat-window')).toBeInTheDocument())
    expect(container.querySelector('.h-screen')).toBeNull()
    // dvh-based height accounting for sticky header (h-14) and MobileNav clearance
    expect(container.firstElementChild?.className).toContain('dvh')
  })
})
