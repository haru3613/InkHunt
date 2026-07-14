import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * HAR-666: page.statusBanner.test.tsx only exercises the empty-inquiries
 * (OnboardingChecklist) branch. This file covers the stats/recent-list
 * branch that renders once at least one inquiry exists.
 */

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
    <a href={typeof href === 'string' ? href : '/'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { displayName: '刺青師' },
    artist: {
      status: 'active',
      display_name: '刺青師',
      price_min: 3000,
      portfolio_count: 5,
      slug: 'test-artist',
    },
  }),
}))

import DashboardPage from '../page'

const INQUIRIES = [
  {
    id: 'inq-1',
    consumer_name: '王小明',
    description: '想刺一個小圖案在手臂上',
    body_part: '手臂',
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  },
  {
    id: 'inq-2',
    consumer_name: null,
    description: '想刺背後大圖',
    body_part: null,
    status: 'quoted' as const,
    created_at: new Date().toISOString(),
  },
  {
    id: 'inq-3',
    consumer_name: '陳先生',
    description: '完成的案子',
    body_part: '小腿',
    status: 'closed' as const,
    created_at: new Date().toISOString(),
  },
]

describe('DashboardPage with inquiries', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: INQUIRIES }),
      }),
    )
  })

  it('shows the greeting, stat counts by status, and the recent inquiry list', async () => {
    render(<DashboardPage />)

    expect(await screen.findByText('歡迎回來，刺青師')).toBeInTheDocument()

    // Stats: 1 pending, 1 quoted, 1 closed (accepted+closed bucket)
    expect(screen.getByText('待處理詢價')).toBeInTheDocument()
    expect(screen.getByText('已報價')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()

    // Recent list renders each inquiry's label (consumer name or anonymous fallback)
    expect(screen.getByText('王小明')).toBeInTheDocument()
    expect(screen.getByText('匿名用戶')).toBeInTheDocument()
    expect(screen.getByText('陳先生')).toBeInTheDocument()
    expect(screen.getByText('手臂')).toBeInTheDocument()

    // Quick actions + share-profile link (artist.slug present)
    expect(screen.getByRole('link', { name: '上傳作品' })).toHaveAttribute(
      'href',
      '/artist/portfolio',
    )
    expect(screen.getByRole('link', { name: '分享 Profile 連結' })).toHaveAttribute(
      'href',
      '/artists/test-artist',
    )
  })
})
