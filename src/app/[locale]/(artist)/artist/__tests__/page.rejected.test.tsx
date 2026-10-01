import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockPush = vi.fn()

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockPush }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('next-intl', () => ({ useLocale: () => 'zh-TW' }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoading: false,
    isLoggedIn: true,
    artist: { status: 'suspended' },
    loginWithRedirect: vi.fn(),
  }),
}))

import ArtistEntryPage from '../page'

describe('ArtistEntryPage suspended artist state', () => {
  it('renders the rejected screen for suspended artists', () => {
    render(<ArtistEntryPage />)
    expect(screen.getByRole('heading', { name: '審核未通過' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新送審' })).toBeInTheDocument()
  })
})
