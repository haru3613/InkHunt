import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

// Mock i18n navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock useAuth — logged-in user
const mockLogout = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isLoading: false,
    user: { lineUserId: 'U123', displayName: 'Test', avatarUrl: null },
    artist: null,
    loginWithRedirect: vi.fn(),
    logout: mockLogout,
    refetch: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('calls router.push on logout instead of window.location', async () => {
    const { Header } = await import('../Header')
    render(<Header />)
    const user = userEvent.setup()

    // Open dropdown menu — click the avatar/user button
    const buttons = screen.getAllByRole('button')
    const avatarButton = buttons[0]
    await user.click(avatarButton)

    // Click logout
    const logoutButton = screen.getByText('登出')
    await user.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
