import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Page-layer test for ProfilePage (HAR-666): this page had 0% coverage.
 * ProfileForm and QuoteTemplateManager already have their own dedicated unit
 * tests, so this test focuses on the logic that lives IN the page itself —
 * the parallel-fetch orchestration in the load effect (existing vs.
 * not-yet-registered artist), the loading state, and the page-owned
 * `handleSaveTemplates` callback (translates a non-ok PUT into a thrown
 * error for QuoteTemplateManager to catch).
 */

const authState = vi.hoisted(() => ({
  artist: { slug: 'test-artist' } as { slug: string } | null,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

// next-intl is only reached via the real (unmocked) QuoteTemplateManager
// child; stub it to the raw key, same pattern as QuoteTemplateManager's own
// test.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('lucide-react', () => ({
  Plus: () => <svg data-testid="icon-plus" />,
  Trash2: () => <svg data-testid="icon-trash2" />,
}))

const ARTIST = {
  id: 'artist-uuid-1',
  slug: 'test-artist',
  display_name: '阿明',
  styles: [{ id: 1, name: 'Traditional' }],
}

function mockFetchByUrl(handlers: Record<string, { ok: boolean; json?: unknown }>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    const key = Object.keys(handlers).find((k) => url.includes(k))
    const h = key ? handlers[key] : { ok: true, json: {} }
    return Promise.resolve({ ok: h.ok, json: async () => h.json ?? {} } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

import ProfilePage from '../page'

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    authState.artist = { slug: 'test-artist' }
  })

  it('shows a loading state before the parallel fetches settle', () => {
    mockFetchByUrl({ '/api/styles': { ok: true, json: [] } })
    render(<ProfilePage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('loads styles + the artist by slug + templates, then renders the edit form', async () => {
    mockFetchByUrl({
      '/api/styles': { ok: true, json: { data: [{ id: 1, name: 'Traditional' }] } },
      '/api/artists/test-artist': { ok: true, json: ARTIST },
      '/api/artists/me/templates': { ok: true, json: { templates: [] } },
    })

    render(<ProfilePage />)

    await waitFor(() => expect(screen.getByText('編輯個人檔案')).toBeInTheDocument())
    // style pill fed from the loaded styles response
    expect(screen.getByText('Traditional')).toBeInTheDocument()
  })

  it('skips the artist-by-slug fetch and shows the apply heading when not yet registered', async () => {
    authState.artist = null
    const fetchMock = mockFetchByUrl({
      '/api/styles': { ok: true, json: { data: [] } },
      '/api/artists/me/templates': { ok: true, json: { templates: [] } },
    })

    render(<ProfilePage />)

    await waitFor(() => expect(screen.getByText('申請成為刺青師')).toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/artists/test-artist'))).toBe(false)
  })

  it('degrades to the apply heading (no crash) when a load fetch rejects', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('network down')))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProfilePage />)

    await waitFor(() => expect(screen.getByText('申請成為刺青師')).toBeInTheDocument())
  })

  it('PUTs the locally-added template and shows the saved state on success', async () => {
    mockFetchByUrl({
      '/api/styles': { ok: true, json: { data: [] } },
      '/api/artists/test-artist': { ok: true, json: ARTIST },
      '/api/artists/me/templates': { ok: true, json: { templates: [] } },
    })
    const user = userEvent.setup()

    render(<ProfilePage />)
    await waitFor(() => expect(screen.getByText('編輯個人檔案')).toBeInTheDocument())

    // Switch fetch to answer the upcoming PUT with the saved payload.
    const putFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ templates: [{ label: '小圖案', price: 3000, note: '' }] }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
    vi.stubGlobal('fetch', putFetch)

    await user.click(screen.getByText('addTemplate'))
    await user.click(screen.getByText('saveTemplates'))

    await waitFor(() => {
      const putCall = putFetch.mock.calls.find(([, init]) => init?.method === 'PUT')
      expect(putCall).toBeTruthy()
      expect(String(putCall![0])).toBe('/api/artists/me/templates')
      expect(JSON.parse((putCall![1] as RequestInit).body as string)).toEqual({
        templates: [{ label: '', price: 0, note: '' }],
      })
    })
    // page's handleSaveTemplates resolved without throwing -> QuoteTemplateManager
    // flips its own saved-state label (mocked to the raw translation key).
    await waitFor(() => expect(screen.getByText('saved')).toBeInTheDocument())
  })

  it('propagates a non-ok PUT response as a thrown error for the child to display', async () => {
    mockFetchByUrl({
      '/api/styles': { ok: true, json: { data: [] } },
      '/api/artists/test-artist': { ok: true, json: ARTIST },
      '/api/artists/me/templates': { ok: true, json: { templates: [] } },
    })
    const user = userEvent.setup()

    render(<ProfilePage />)
    await waitFor(() => expect(screen.getByText('編輯個人檔案')).toBeInTheDocument())

    const failFetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) } as Response))
    vi.stubGlobal('fetch', failFetch)

    await user.click(screen.getByText('addTemplate'))
    await user.click(screen.getByText('saveTemplates'))

    await waitFor(() => expect(screen.getByText('saveError')).toBeInTheDocument())
  })
})
