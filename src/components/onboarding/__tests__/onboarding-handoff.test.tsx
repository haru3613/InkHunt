import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'

const auth = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: { user?: { id?: string } } | null) => void),
  unsubscribe: vi.fn(),
  releaseDraftLock: vi.fn(),
  profileExists: false,
}))

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: (callback: (event: string, session: { user?: { id?: string } } | null) => void) => {
        auth.callback = callback
        callback('INITIAL_SESSION', { user: { id: 'supabase-user-1' } })
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } }
      },
      signOut: vi.fn(),
    },
  })),
}))

vi.mock('@/lib/onboarding-draft', () => ({
  onboardingFileKey: (file: File) => `${file.name}\u0000${file.type}\u0000${file.size}\u0000${file.lastModified}`,
  readOnboardingDraft: vi.fn(async () => null),
  writeOnboardingDraft: vi.fn(async () => {}),
  clearOnboardingDraft: vi.fn(async () => {}),
  acquireOnboardingDraftLock: vi.fn(async () => auth.releaseDraftLock),
}))

const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: router.replace }),
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
}))

import { AuthProvider } from '@/hooks/useAuth'
import OnboardingPage from '@/app/[locale]/(artist)/artist/onboarding/page'
import PortfolioPage from '@/app/[locale]/(artist)/artist/portfolio/page'

const user = {
  lineUserId: 'line-user-1',
  displayName: 'Harvey Test',
  avatarUrl: null,
}

function authResponse() {
  return {
    user,
    isAdmin: false,
    artist: auth.profileExists
      ? {
          id: 'artist-1',
          slug: 'harvey-test',
          display_name: 'Harvey Test',
          status: 'pending' as const,
          price_min: 2000,
          portfolio_count: 0,
        }
      : null,
  }
}

function HandoffHarness() {
  const [page, setPage] = useState<'onboarding' | 'portfolio'>('onboarding')
  router.replace.mockImplementation((path: string) => {
    if (path === '/artist/portfolio') setPage('portfolio')
  })

  return <AuthProvider>{page === 'onboarding' ? <OnboardingPage /> : <PortfolioPage />}</AuthProvider>
}

describe('onboarding artist handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.profileExists = false
    auth.callback = undefined
    auth.releaseDraftLock.mockReset()
    router.replace.mockReset()

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/auth/me') {
        return { ok: true, json: async () => authResponse() }
      }
      if (path === '/api/artists' && init?.method === 'POST') {
        auth.profileExists = true
        return { ok: true, json: async () => ({ slug: 'harvey-test' }) }
      }
      if (path === '/api/artists/me/portfolio') {
        return { ok: true, json: async () => [] }
      }
      if (path === '/api/styles') {
        return { ok: true, json: async () => [] }
      }
      throw new Error(`Unexpected request: ${path}`)
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes the shared auth state after a zero-photo application before opening portfolio management', async () => {
    render(<HandoffHarness />)

    await screen.findByRole('heading', { name: '建立你的刺青師檔案' })
    expect(await screen.findByLabelText(/藝名 \/ 名字/)).toHaveValue('Harvey Test')

    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    fireEvent.click(screen.getByRole('button', { name: /極簡線條/ }))
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    fireEvent.click(screen.getByRole('button', { name: '台北市' }))
    fireEvent.change(screen.getByLabelText(/參考起始價格/), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText('送出前確認')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '送出申請，稍後補作品' }))

    await screen.findByRole('heading', { name: '申請已送出' })
    expect(auth.profileExists).toBe(true)
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/auth/me', expect.anything()))

    fireEvent.click(screen.getByRole('button', { name: '繼續上傳作品' }))

    await screen.findByRole('heading', { name: '作品集管理' })
    expect(screen.queryByText('你還不是刺青師，先完成申請即可管理作品集')).not.toBeInTheDocument()
  })
})
