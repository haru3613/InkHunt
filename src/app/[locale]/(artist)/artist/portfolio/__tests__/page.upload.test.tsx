import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * HAR-666: page.test.tsx only covers the delete flow. This file covers
 * handleUpload (POST per url, append on success, skip on failure) — the
 * other uncovered branch of PortfolioPage.
 */

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const authState = vi.hoisted(() => ({
  artist: { slug: 'test-artist', id: 'artist-uuid-1' },
  isLoading: false,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

let capturedOnUpload: ((urls: string[]) => Promise<void>) | undefined

vi.mock('@/components/artists/PortfolioUploader', () => ({
  PortfolioUploader: ({ onUpload }: { onUpload: (urls: string[]) => Promise<void> }) => {
    capturedOnUpload = onUpload
    return <div data-testid="uploader" />
  },
}))

import PortfolioPage from '../page'

describe('PortfolioPage upload', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    capturedOnUpload = undefined
  })

  it('collects searchable metadata before POSTing an uploaded url', async () => {
    const newItem = {
      id: 'new-item-1',
      artist_id: 'artist-uuid-1',
      image_url: 'https://example.com/new.jpg',
      title: '新作品',
    }
    const fetchMock = vi
      .fn()
      // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // styles
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 3, name: '花卉' }] }) })
      // upload POST
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        ...newItem,
        description: '牡丹 花朵 黑灰',
        style_id: 3,
        body_part: '前臂',
        size_cm: '12 cm',
        healed_image_url: null,
      }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<PortfolioPage />)
    await waitFor(() => expect(screen.getByText('0 件作品')).toBeInTheDocument())

    await waitFor(() => expect(capturedOnUpload).toBeDefined())
    await capturedOnUpload!(['https://example.com/new.jpg'])

    expect(await screen.findByRole('heading', { name: '完成作品資料' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/作品名稱/), '新作品')
    await user.selectOptions(screen.getByLabelText(/風格/), '3')
    await user.type(screen.getByLabelText(/刺青部位/), '前臂')
    await user.type(screen.getByLabelText(/作品描述與題材/), '牡丹 花朵 黑灰')
    await user.type(screen.getByLabelText(/尺寸/), '12 cm')
    await user.click(screen.getByRole('button', { name: '發布作品' }))

    await waitFor(() => expect(screen.getByText('1 件作品')).toBeInTheDocument())

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCall).toBeTruthy()
    expect(postCall![0]).toBe('/api/artists/test-artist/portfolio')
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({
      image_url: 'https://example.com/new.jpg',
      title: '新作品',
      description: '牡丹 花朵 黑灰',
      style_id: 3,
      body_part: '前臂',
      size_cm: '12 cm',
      healed_image_url: null,
    })
  })

  it('retains an already uploaded URL after POST failure so publishing can retry without uploading bytes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 3, name: '花卉' }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<PortfolioPage />)
    await waitFor(() => expect(screen.getByText('0 件作品')).toBeInTheDocument())

    await waitFor(() => expect(capturedOnUpload).toBeDefined())
    await capturedOnUpload!(['https://example.com/fails.jpg'])

    await user.type(await screen.findByLabelText(/作品名稱/), '待重試作品')
    await user.selectOptions(screen.getByLabelText(/風格/), '3')
    await user.click(screen.getByRole('button', { name: '發布作品' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('不需要重新上傳圖片')
    expect(screen.getByText(/1 張圖片已上傳/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('待重試作品')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(1)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'retried-item',
        artist_id: 'artist-uuid-1',
        image_url: 'https://example.com/fails.jpg',
        title: '待重試作品',
        description: null,
        style_id: 3,
        body_part: null,
        size_cm: null,
        healed_image_url: null,
        thumbnail_url: null,
        sort_order: 0,
        created_at: '2026-10-01T00:00:00Z',
      }),
    })
    await user.click(screen.getByRole('button', { name: '發布作品' }))

    await waitFor(() => expect(screen.getByText('1 件作品')).toBeInTheDocument())
    expect(screen.queryByText(/圖片已上傳，請完成作品資料/)).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toHaveLength(2)
  })
})
