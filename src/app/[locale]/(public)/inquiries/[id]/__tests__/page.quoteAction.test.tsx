import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

/**
 * HAR-666: page.auth.test.tsx and page.nextStep.test.tsx stub ChatWindow away
 * entirely, so handleQuoteAction and the back-navigation button were never
 * exercised. This file covers both.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inq_1' }),
}))

const push = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh-TW',
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { lineUserId: 'U_test' },
    isLoggedIn: true,
    isLoading: false,
    loginWithRedirect: vi.fn(),
  }),
}))

let capturedOnQuoteAction:
  | ((quoteId: string, action: 'accepted' | 'rejected') => Promise<void>)
  | undefined

vi.mock('@/components/chat/ChatWindow', () => ({
  ChatWindow: ({
    onQuoteAction,
  }: {
    onQuoteAction: (quoteId: string, action: 'accepted' | 'rejected') => Promise<void>
  }) => {
    capturedOnQuoteAction = onQuoteAction
    return <div data-testid="chat-window" />
  },
}))

import ConsumerChatPage from '../page'

describe('ConsumerChatPage quote action + back navigation', () => {
  beforeEach(() => {
    push.mockClear()
    capturedOnQuoteAction = undefined
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        inquiry: { id: 'inq_1', status: 'pending' },
        artist: { display_name: 'Ink Master' },
      }),
    })) as unknown as typeof fetch
  })

  it('PATCHes /api/inquiries/:id/quotes with the quote id + status', async () => {
    render(<ConsumerChatPage />)
    await waitFor(() => expect(capturedOnQuoteAction).toBeDefined())

    await capturedOnQuoteAction!('quote-9', 'accepted')

    const patchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) =>
        call[0] === '/api/inquiries/inq_1/quotes' &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    )
    expect(patchCall).toBeTruthy()
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      quote_id: 'quote-9',
      status: 'accepted',
    })
  })

  it('navigates back to /inquiries when the back button is clicked', async () => {
    render(<ConsumerChatPage />)
    await waitFor(() => expect(screen.getByTestId('chat-window')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button'))

    expect(push).toHaveBeenCalledWith('/inquiries')
  })
})
