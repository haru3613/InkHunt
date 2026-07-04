import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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
      status: 'pending',
      display_name: '刺青師',
      price_min: null,
      portfolio_count: 0,
      slug: 'artist',
    },
  }),
}))

import DashboardPage from '../page'

describe('DashboardPage status banner', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }),
    )
  })

  it('shows the artist review status before the empty-inquiry checklist', async () => {
    render(<DashboardPage />)
    expect(await screen.findByText('待審核')).toBeInTheDocument()
    expect(screen.getByText('基本資料已填寫')).toBeInTheDocument()
  })
})
