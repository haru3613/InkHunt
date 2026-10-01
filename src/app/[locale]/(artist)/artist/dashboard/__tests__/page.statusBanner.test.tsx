import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { dashboardFixture } from '@/components/artists/dashboard/__tests__/fixture'

vi.mock('@/i18n/navigation', () => ({ Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { displayName: '刺青師' }, artist: { status: 'pending', display_name: '刺青師', price_min: null, portfolio_count: 0, slug: 'artist' } }) }))
import DashboardPage from '../page'

describe('DashboardPage status banner', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => dashboardFixture() })))
  it('keeps review status and a real portfolio action visible alongside the workspace', async () => {
    render(<DashboardPage />)
    expect(screen.getByText('待審核')).toBeInTheDocument()
    expect(screen.getByText(/基本資料已填寫/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '上傳作品' })).toHaveAttribute('href', '/artist/portfolio')
    expect(await screen.findByText('47')).toBeInTheDocument()
  })
})
