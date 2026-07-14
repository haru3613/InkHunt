import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

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

  it('POSTs each uploaded url and appends the returned item to the grid', async () => {
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
      // upload POST
      .mockResolvedValueOnce({ ok: true, json: async () => newItem })
    vi.stubGlobal('fetch', fetchMock)

    render(<PortfolioPage />)
    await waitFor(() => expect(screen.getByText('0 件作品')).toBeInTheDocument())

    await waitFor(() => expect(capturedOnUpload).toBeDefined())
    await capturedOnUpload!(['https://example.com/new.jpg'])

    await waitFor(() => expect(screen.getByText('1 件作品')).toBeInTheDocument())

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCall).toBeTruthy()
    expect(postCall![0]).toBe('/api/artists/test-artist/portfolio')
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({
      image_url: 'https://example.com/new.jpg',
    })
  })

  it('does not append an item when the upload POST fails (non-ok response)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    render(<PortfolioPage />)
    await waitFor(() => expect(screen.getByText('0 件作品')).toBeInTheDocument())

    await waitFor(() => expect(capturedOnUpload).toBeDefined())
    await capturedOnUpload!(['https://example.com/fails.jpg'])

    // Still 0 — failed upload was not appended
    expect(screen.getByText('0 件作品')).toBeInTheDocument()
  })
})
