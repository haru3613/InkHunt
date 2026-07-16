import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockLogout = vi.fn().mockResolvedValue(undefined)
const mockLoginWithRedirect = vi.fn()

const authState = vi.hoisted(() => ({
  isLoggedIn: true as boolean,
  isAdmin: false as boolean,
  isLoading: false,
  user: {
    lineUserId: 'U123',
    displayName: 'Test',
    avatarUrl: null as string | null,
  } as {
    lineUserId: string
    displayName: string
    avatarUrl: string | null
  } | null,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: authState.isLoggedIn,
    isAdmin: authState.isAdmin,
    isLoading: authState.isLoading,
    user: authState.user,
    artist: null,
    loginWithRedirect: mockLoginWithRedirect,
    logout: mockLogout,
    refetch: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
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
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

describe('AuthSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    authState.isLoggedIn = true
    authState.isAdmin = false
    authState.user = { lineUserId: 'U123', displayName: 'Test', avatarUrl: null }
    vi.unstubAllGlobals()
  })

  it('renders avatar button when logged in', async () => {
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens menu with artist backend link and calls logout + router.push', async () => {
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('刺青師後台')).toBeInTheDocument()
    await user.click(screen.getByText('登出'))

    expect(mockLogout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows admin backend link only when isAdmin', async () => {
    authState.isAdmin = true
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button')[0])
    const adminLink = screen.getByText('admin')
    expect(adminLink.closest('a')).toHaveAttribute('href', '/admin')
  })

  it('hides admin link for non-admin users', async () => {
    authState.isAdmin = false
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button')[0])
    expect(screen.queryByText('admin')).not.toBeInTheDocument()
  })

  it('renders login button when logged out outside development', async () => {
    authState.isLoggedIn = false
    authState.user = null
    vi.stubEnv('NODE_ENV', 'production')

    vi.resetModules()
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '登入' }))
    expect(mockLoginWithRedirect).toHaveBeenCalledWith('/')

    vi.unstubAllEnvs()
  })

  it('shows Dev Login picker in development when logged out', async () => {
    authState.isLoggedIn = false
    authState.user = null
    vi.stubEnv('NODE_ENV', 'development')

    vi.resetModules()
    const { AuthSection } = await import('../AuthSection')
    render(<AuthSection loginLabel="登入" />)

    expect(screen.getByText('Dev Login')).toBeInTheDocument()

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    await user.click(screen.getByText('Dev Login'))
    await user.click(screen.getByText('小明'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/dev-login',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(mockRefresh).toHaveBeenCalled()

    vi.unstubAllEnvs()
  })
})
