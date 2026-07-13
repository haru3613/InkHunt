import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

// --- Mocks (declared before component import) ---

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inq_1' }),
}))

// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// t('nextStep.<status>') → 'nextStep.<status>' so we assert the wired key path
// and prove it switches with status (the real copy lives in Slice A messages,
// covered by inquiry-i18n.statusPill.test.ts).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh-TW',
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { lineUserId: 'U_test' },
    isLoggedIn: true,
    isLoading: false,
  }),
}))

vi.mock('@/components/chat/ChatWindow', () => ({
  ChatWindow: () => <div data-testid="chat-window" />,
}))

import ConsumerChatPage from '../page'

function mockInquiryStatus(status: string) {
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      inquiry: { id: 'inq_1', status },
      artist: { display_name: 'Ink Master' },
    }),
  })) as unknown as typeof fetch
}

describe('ConsumerChatPage next-step expectation copy (HAR-513)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each(['pending', 'quoted', 'accepted', 'closed'])(
    'renders nextStep copy for status %s',
    async (status) => {
      mockInquiryStatus(status)
      render(<ConsumerChatPage />)
      await waitFor(() =>
        expect(screen.getByText(`nextStep.${status}`)).toBeInTheDocument(),
      )
    },
  )

  it('switches the next-step line when status changes', async () => {
    mockInquiryStatus('pending')
    const { unmount } = render(<ConsumerChatPage />)
    await waitFor(() =>
      expect(screen.getByText('nextStep.pending')).toBeInTheDocument(),
    )
    unmount()

    mockInquiryStatus('quoted')
    render(<ConsumerChatPage />)
    await waitFor(() =>
      expect(screen.getByText('nextStep.quoted')).toBeInTheDocument(),
    )
    expect(screen.queryByText('nextStep.pending')).not.toBeInTheDocument()
  })

  // HAR-667: the '刺青師' fallback for a missing artist display_name was a
  // hardcoded zh-TW literal; it now falls back to t('defaultArtistName').
  it('falls back to the defaultArtistName translation key when artist.display_name is missing', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ inquiry: { id: 'inq_1', status: 'pending' }, artist: {} }),
    })) as unknown as typeof fetch

    render(<ConsumerChatPage />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'defaultArtistName' })).toBeInTheDocument(),
    )
  })
})
