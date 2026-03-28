import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockLogout = vi.fn().mockResolvedValue(undefined)
const mockLoginWithRedirect = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isLoading: false,
    user: { lineUserId: 'U123', displayName: 'Test', avatarUrl: null },
    artist: null,
    loginWithRedirect: mockLoginWithRedirect,
    logout: mockLogout,
    refetch: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('AuthSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  it('renders avatar button when logged in', async () => {
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls router.push on logout', async () => {
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button')[0])
    await user.click(screen.getByText('登出'))

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
