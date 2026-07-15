import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArtistWithDetails } from '@/types/admin'

/**
 * Client admin page: fetch list, tab filter, search, error + retry.
 * Heavy children stubbed so we assert page wiring only.
 */

const ARTISTS: ArtistWithDetails[] = [
  {
    id: 'a1',
    line_user_id: 'u1',
    display_name: 'Ink Wolf',
    slug: 'ink-wolf',
    bio: null,
    avatar_url: null,
    city: '台北市',
    district: null,
    ig_handle: 'inkwolf',
    price_min: 3000,
    price_max: 8000,
    status: 'pending',
    admin_note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    styles: [{ id: 's1', name: 'Blackwork', slug: 'blackwork', description: null }],
  },
  {
    id: 'a2',
    line_user_id: 'u2',
    display_name: 'Sakura Ink',
    slug: 'sakura-ink',
    bio: null,
    avatar_url: null,
    city: '高雄市',
    district: null,
    ig_handle: null,
    price_min: null,
    price_max: null,
    status: 'active',
    admin_note: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    styles: [],
  },
]

vi.mock('@/components/admin/AdminStatsBar', () => ({
  AdminStatsBar: ({
    counts,
  }: {
    counts: { pending: number; active: number; suspended: number; total: number }
  }) => (
    <div data-testid="stats-bar">
      pending:{counts.pending} active:{counts.active} total:{counts.total}
    </div>
  ),
}))

vi.mock('@/components/admin/ArtistTable', () => ({
  ArtistTable: ({
    artists,
  }: {
    artists: ArtistWithDetails[]
    onStatusChange: unknown
  }) => (
    <div data-testid="artist-table">
      {artists.map((a) => (
        <div key={a.id} data-testid={`row-${a.id}`}>
          {a.display_name}
        </div>
      ))}
    </div>
  ),
}))

import AdminPage from '../page'

describe('AdminPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading then artists after successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: ARTISTS }),
      }),
    )

    render(<AdminPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('InkHunt Admin')).toBeInTheDocument()
    })
    expect(screen.getByTestId('row-a1')).toHaveTextContent('Ink Wolf')
    expect(screen.getByTestId('row-a2')).toHaveTextContent('Sakura Ink')
    expect(screen.getByTestId('stats-bar')).toHaveTextContent('pending:1')
    expect(screen.getByTestId('stats-bar')).toHaveTextContent('active:1')
  })

  it('filters by status tab and search query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: ARTISTS }),
      }),
    )
    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByTestId('row-a1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /待審核/ }))
    expect(screen.getByTestId('row-a1')).toBeInTheDocument()
    expect(screen.queryByTestId('row-a2')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /全部/ }))
    await user.type(screen.getByPlaceholderText('搜尋刺青師名稱或城市...'), '高雄')
    await waitFor(() => {
      expect(screen.queryByTestId('row-a1')).not.toBeInTheDocument()
      expect(screen.getByTestId('row-a2')).toBeInTheDocument()
    })
  })

  it('shows error state and retries fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: ARTISTS }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText(/載入失敗/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '重試' }))
    await waitFor(() => {
      expect(screen.getByTestId('row-a1')).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
