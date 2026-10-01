import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

const query = vi.hoisted(() => ({ id: 'older-inquiry' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('inquiry=' + query.id) }))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { lineUserId: 'artist-owner', displayName: 'Artist' }, artist: { id: 'artist-1' } }) }))
vi.mock('@/components/chat/ChatWindow', () => ({ ChatWindow: ({ inquiryId }: { inquiryId: string }) => <div>opened-{inquiryId}</div> }))
vi.mock('@/components/chat/QuoteFormModal', () => ({ QuoteFormModal: ({ templates }: { templates: unknown[] }) => <div data-testid="template-count">{templates.map(() => 1).length}</div> }))
import InquiriesPage from '../page'

const inquiry = { id: 'older-inquiry', artist_id: 'artist-1', consumer_line_id: 'consumer-1', consumer_name: '行事曆客人', description: '植物刺青討論', reference_images: [], body_part: '前臂', status: 'accepted', created_at: '2026-01-01T00:00:00Z' }

function stubFetch(detail: unknown, status = 200, templates: unknown = []) {
  const mock = vi.fn().mockImplementation(async (url: string) => {
    if (url === '/api/inquiries/older-inquiry') return { ok: status === 200, status, json: async () => detail }
    if (url.includes('templates')) return { ok: true, json: async () => ({ templates }) }
    return { ok: true, json: async () => ({ data: [] }) }
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('Calendar conversation links', () => {
  it('keeps conversations usable when legacy quote templates are not an array', async () => {
    query.id = 'older-inquiry'
    stubFetch({ inquiry }, 200, '[]')
    render(<InquiriesPage />)
    expect(await screen.findByText('opened-older-inquiry')).toBeInTheDocument()
    expect(screen.getByTestId('template-count')).toHaveTextContent('0')
  })
  it('ignores an old response after navigating to a different conversation', async () => {
    query.id = 'older-inquiry'
    let finishOld!: (value: unknown) => void
    const oldResponse = new Promise(resolve => { finishOld = resolve })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/inquiries/older-inquiry') return oldResponse
      if (url === '/api/inquiries/newer-inquiry') return { ok: true, json: async () => ({ inquiry: { ...inquiry, id: 'newer-inquiry' } }) }
      return { ok: true, json: async () => ({ data: [], templates: [] }) }
    }))
    const { rerender } = render(<InquiriesPage />)
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/inquiries/older-inquiry', expect.anything()))
    query.id = 'newer-inquiry'
    rerender(<InquiriesPage />)
    expect(await screen.findByText('opened-newer-inquiry')).toBeInTheDocument()
    await act(async () => { finishOld({ ok: true, json: async () => ({ inquiry }) }); await oldResponse })
    expect(screen.getByText('opened-newer-inquiry')).toBeInTheDocument()
    expect(screen.queryByText('opened-older-inquiry')).not.toBeInTheDocument()
    query.id = 'older-inquiry'
  })

  it('opens an authorized older inquiry missing from the first inbox page', async () => {
    const fetchMock = stubFetch({ inquiry })
    render(<InquiriesPage />)
    expect(await screen.findByText('opened-older-inquiry')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/inquiries/older-inquiry', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('does not open a detail response belonging to another artist', async () => {
    stubFetch({ inquiry: { ...inquiry, artist_id: 'another-artist' } })
    render(<InquiriesPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('無法開啟指定詢價')
    expect(screen.queryByText('opened-older-inquiry')).not.toBeInTheDocument()
    expect(screen.queryByText('行事曆客人')).not.toBeInTheDocument()
  })
})
