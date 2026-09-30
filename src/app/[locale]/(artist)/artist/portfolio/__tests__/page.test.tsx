import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const authState = vi.hoisted(() => ({
  artist: { slug: 'test-artist', id: 'artist-uuid-1' },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const MOCK_ITEMS = [
  {
    id: 'item-uuid-1',
    artist_id: 'artist-uuid-1',
    image_url: 'https://example.com/1.jpg',
    thumbnail_url: null,
    title: '玫瑰刺青',
    description: null,
    body_part: null,
    size_cm: null,
    style_id: null,
    healed_image_url: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
]

function mockFetchSequence(responses: Array<{ ok: boolean; json?: unknown }>) {
  const fetchMock = vi.fn()
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: r.ok,
      json: async () => r.json ?? [],
    })
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

import PortfolioPage from '../page'

describe('PortfolioPage delete', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('removes the item from the grid when DELETE succeeds', async () => {
    mockFetchSequence([
      { ok: true, json: MOCK_ITEMS },
      { ok: true, json: { data: [{ id: 1, name: '日式傳統' }] } },
      { ok: true },
    ])
    const user = userEvent.setup()

    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getByText('玫瑰刺青')).toBeInTheDocument())

    const deleteButton = screen.getByRole('button', { name: /刪除|delete/i })
    await user.click(deleteButton)

    await waitFor(() => expect(screen.queryByText('玫瑰刺青')).not.toBeInTheDocument())
  })

  it('keeps the item in the grid and shows an error when DELETE fails (non-ok response)', async () => {
    mockFetchSequence([
      { ok: true, json: MOCK_ITEMS },
      { ok: true, json: { data: [{ id: 1, name: '日式傳統' }] } },
      { ok: false },
    ])
    const user = userEvent.setup()

    render(<PortfolioPage />)

    await waitFor(() => expect(screen.getByText('玫瑰刺青')).toBeInTheDocument())

    const deleteButton = screen.getByRole('button', { name: /刪除|delete/i })
    await user.click(deleteButton)

    await waitFor(() => expect(screen.getByText(/刪除失敗/)).toBeInTheDocument())
    expect(screen.getByText('玫瑰刺青')).toBeInTheDocument()
  })

  it('opens the editor and PATCHes searchable portfolio metadata', async () => {
    const updatedItem = {
      ...MOCK_ITEMS[0],
      title: '玫瑰與蛇',
      description: '玫瑰 蛇 黑灰',
      style_id: 4,
    }
    const fetchMock = mockFetchSequence([
      { ok: true, json: MOCK_ITEMS },
      { ok: true, json: { data: [{ id: 4, name: '黑灰寫實' }] } },
      { ok: true, json: updatedItem },
    ])
    const user = userEvent.setup()

    render(<PortfolioPage />)
    await screen.findByText('玫瑰刺青')
    await user.click(screen.getByRole('button', { name: '編輯' }))
    const title = screen.getByLabelText(/作品名稱/)
    await user.clear(title)
    await user.type(title, '玫瑰與蛇')
    await user.selectOptions(screen.getByLabelText(/風格/), '4')
    await user.type(screen.getByLabelText(/作品描述與題材/), '玫瑰 蛇 黑灰')
    await user.click(screen.getByRole('button', { name: '儲存變更' }))

    await waitFor(() => expect(screen.getByText('玫瑰與蛇')).toBeInTheDocument())
    const patchCall = fetchMock.mock.calls.find(([, init]) =>
      (init as RequestInit | undefined)?.method === 'PATCH',
    )
    expect(patchCall?.[0]).toBe('/api/artists/test-artist/portfolio/item-uuid-1')
    expect(JSON.parse((patchCall?.[1] as RequestInit).body as string)).toEqual(
      expect.objectContaining({ title: '玫瑰與蛇', description: '玫瑰 蛇 黑灰', style_id: 4 }),
    )
  })
})
