import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * HAR-666: page.rejected.test.tsx only covers the suspended-artist branch.
 * This file covers the remaining states of ArtistEntryPage: loading,
 * logged-out landing screen (+ login click), pending screen, and the
 * redirect effects (no artist -> onboarding, active artist -> dashboard).
 */

const mockPush = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const authState = vi.hoisted(() => ({
  isLoading: false,
  isLoggedIn: false,
  artist: null as { status: string } | null,
  loginWithRedirect: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

import ArtistEntryPage from '../page'

describe('ArtistEntryPage states', () => {
  beforeEach(() => {
    mockPush.mockClear()
    authState.loginWithRedirect = vi.fn()
    authState.isLoading = false
    authState.isLoggedIn = false
    authState.artist = null
  })

  it('shows a loading screen while auth is resolving', () => {
    authState.isLoading = true
    render(<ArtistEntryPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows the landing screen with a LINE login CTA when logged out', async () => {
    authState.isLoggedIn = false
    render(<ArtistEntryPage />)

    expect(screen.getByText('在 InkHunt 展示你的作品')).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: 'LINE 登入開始建立' })

    await userEvent.click(cta)
    expect(authState.loginWithRedirect).toHaveBeenCalledWith('/artist')
  })

  it('shows the pending-review screen for a pending artist', () => {
    authState.isLoggedIn = true
    authState.artist = { status: 'pending' }
    render(<ArtistEntryPage />)
    expect(screen.getByText('申請審核中')).toBeInTheDocument()
  })

  it('redirects to onboarding when logged in with no artist record', () => {
    authState.isLoggedIn = true
    authState.artist = null
    render(<ArtistEntryPage />)
    expect(mockPush).toHaveBeenCalledWith('/artist/onboarding')
  })

  it('redirects to the dashboard when the artist is active', () => {
    authState.isLoggedIn = true
    authState.artist = { status: 'active' }
    render(<ArtistEntryPage />)
    expect(mockPush).toHaveBeenCalledWith('/artist/dashboard')
  })
})
