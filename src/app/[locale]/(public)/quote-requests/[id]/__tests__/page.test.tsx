import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'qr-1' }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, number>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}))

vi.mock('@/components/quotes/QuoteCompareCard', () => ({
  QuoteCompareCard: ({
    artistName,
    quote,
    onAccept,
  }: {
    artistName: string
    quote: { id: string } | null
    onAccept: () => void
  }) => (
    <div data-testid="compare-card">
      <span>{artistName}</span>
      {quote && (
        <button type="button" onClick={onAccept}>
          accept-{quote.id}
        </button>
      )}
    </div>
  ),
}))

import QuoteRequestPage from '../page'

const payload = {
  id: 'qr-1',
  inquiries: [
    {
      id: 'inq-1',
      artist: {
        display_name: 'Ink Wolf',
        avatar_url: null,
        city: '台北市',
        slug: 'ink-wolf',
      },
      quotes: [
        {
          id: 'q1',
          price: 5000,
          note: 'ok',
          status: 'sent',
          available_dates: null,
        },
      ],
    },
    {
      id: 'inq-2',
      artist: {
        display_name: 'Sakura',
        avatar_url: null,
        city: null,
        slug: 'sakura',
      },
      quotes: [],
    },
  ],
}

describe('QuoteRequestPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads quote request and shows progress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    )

    render(<QuoteRequestPage />)
    await waitFor(() => {
      expect(screen.getByText('yourInquiry')).toBeInTheDocument()
    })
    expect(screen.getByText(/quotesReceived/)).toBeInTheDocument()
    expect(screen.getAllByTestId('compare-card')).toHaveLength(2)
    expect(screen.getByText('Ink Wolf')).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'not found' }),
      }),
    )

    render(<QuoteRequestPage />)
    await waitFor(() => {
      expect(screen.getByText('not found')).toBeInTheDocument()
    })
  })

  it('accepts a quote via PATCH and refetches', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/quotes') && init?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => payload })
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<QuoteRequestPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'accept-q1' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'accept-q1' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/inquiries/inq-1/quotes',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })


  it('shows waiting empty state when inquiries list is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'qr-1', inquiries: [] }),
      }),
    )

    render(<QuoteRequestPage />)
    await waitFor(() => {
      expect(screen.getByText('waiting')).toBeInTheDocument()
    })
  })
})
