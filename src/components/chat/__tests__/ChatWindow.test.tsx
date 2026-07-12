import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Message } from '@/types/database'
import { ChatWindow } from '../ChatWindow'

const NEXT_STEP_COPY = '先回覆需求，再送報價；成交或不適合時可關閉詢價。'

vi.mock('@/hooks/useRealtimeMessages', () => ({
  useRealtimeMessages: vi.fn(),
}))

vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message, onQuoteAction }: { message: Message; onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void }) => (
    <>
      <div data-testid={`msg-${message.id}`}>{message.content}</div>
      {onQuoteAction && (
        <>
          <button onClick={() => onQuoteAction('q-1', 'accepted')} data-testid="quote-accept-btn">
            Accept Quote
          </button>
        </>
      )}
    </>
  ),
}))

vi.mock('../ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}))

// next-intl: resolve the budget-range labels from a fixed dict so the artist
// budget line renders localized copy. Repo convention — the component test
// asserts the wired label; the real messages live in Slice B (HAR-529,
// `inquiry.budgetRange.*`).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      'options.under_3k': '3,000 以下',
      'options.3k_8k': '3,000–8,000',
      'options.8k_20k': '8,000–20,000',
      'options.20k_50k': '20,000–50,000',
      'options.over_50k': '50,000 以上',
      'options.unsure': '不確定 / 想先問',
      notSpecified: '未提供',
    }
    return dict[key] ?? key
  },
}))

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'

const mockUseRealtimeMessages = vi.mocked(useRealtimeMessages)

function makeSendMessage() {
  return vi.fn()
}

describe('ChatWindow', () => {
  beforeEach(() => {
    mockUseRealtimeMessages.mockClear()
  })

  it('shows loading state when isLoading is true', () => {
    mockUseRealtimeMessages.mockReturnValue({
      messages: [],
      isLoading: true,
      sendMessage: makeSendMessage(),
      refetch: vi.fn(),
    })

    render(
      <ChatWindow
        inquiryId="inq-1"
        currentUserId="user-1"
        isArtist={false}
      />,
    )

    expect(screen.getByText('載入中...')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument()
  })

  it('renders messages when loaded', () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        inquiry_id: 'inq-1',
        sender_type: 'consumer',
        sender_id: 'user-1',
        message_type: 'text',
        content: '你好',
        metadata: {},
        read_at: null,
        created_at: '2026-03-29T10:00:00Z',
      },
      {
        id: 'msg-2',
        inquiry_id: 'inq-1',
        sender_type: 'artist',
        sender_id: 'artist-1',
        message_type: 'text',
        content: '請問想刺什麼圖案？',
        metadata: {},
        read_at: null,
        created_at: '2026-03-29T10:01:00Z',
      },
    ]

    mockUseRealtimeMessages.mockReturnValue({
      messages,
      isLoading: false,
      sendMessage: makeSendMessage(),
      refetch: vi.fn(),
    })

    render(
      <ChatWindow
        inquiryId="inq-1"
        currentUserId="user-1"
        isArtist={false}
      />,
    )

    expect(screen.getByTestId('msg-msg-1')).toBeInTheDocument()
    expect(screen.getByTestId('msg-msg-2')).toBeInTheDocument()
    expect(screen.getByText('你好')).toBeInTheDocument()
    expect(screen.getByText('請問想刺什麼圖案？')).toBeInTheDocument()
  })

  it('renders ChatInput component when not loading', () => {
    mockUseRealtimeMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: makeSendMessage(),
      refetch: vi.fn(),
    })

    render(
      <ChatWindow
        inquiryId="inq-1"
        currentUserId="user-1"
        isArtist={true}
      />,
    )

    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
  })

  it('calls useRealtimeMessages with the provided inquiryId', () => {
    mockUseRealtimeMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: makeSendMessage(),
      refetch: vi.fn(),
    })

    render(
      <ChatWindow
        inquiryId="inq-99"
        currentUserId="user-1"
        isArtist={false}
      />,
    )

    expect(mockUseRealtimeMessages).toHaveBeenCalledWith('inq-99')
  })

  it('renders empty message list without error when there are no messages', () => {
    mockUseRealtimeMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: makeSendMessage(),
      refetch: vi.fn(),
    })

    render(
      <ChatWindow
        inquiryId="inq-1"
        currentUserId="user-1"
        isArtist={false}
      />,
    )

    // ChatInput should still be present
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    // No message bubbles rendered
    expect(screen.queryByTestId(/^msg-/)).not.toBeInTheDocument()
  })

  describe('artist close-lead thread header', () => {
    beforeEach(() => {
      mockUseRealtimeMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        sendMessage: makeSendMessage(),
        refetch: vi.fn(),
      })
    })

    it('shows next-step expectation copy + close action for an artist', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          onCloseLead={vi.fn()}
        />,
      )

      expect(screen.getByText(NEXT_STEP_COPY)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '關閉詢價' })).toBeInTheDocument()
    })

    it('does NOT show the close control or artist copy to a consumer', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="user-1"
          isArtist={false}
          status="pending"
        />,
      )

      expect(screen.queryByText(NEXT_STEP_COPY)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: '關閉詢價' }),
      ).not.toBeInTheDocument()
    })

    it('fires onCloseLead when the artist clicks 關閉詢價', () => {
      const onCloseLead = vi.fn()
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          onCloseLead={onCloseLead}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '關閉詢價' }))
      expect(onCloseLead).toHaveBeenCalledTimes(1)
    })

    it('reflects a closed lead with 已關閉 and hides the close action', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="closed"
          onCloseLead={vi.fn()}
        />,
      )

      expect(screen.getByText('已關閉')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: '關閉詢價' }),
      ).not.toBeInTheDocument()
    })

    it('surfaces a close error without crashing or marking the lead closed', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          onCloseLead={vi.fn()}
          closeError="關閉失敗，請稍後再試"
        />,
      )

      expect(screen.getByText('關閉失敗，請稍後再試')).toBeInTheDocument()
      // still actionable — not falsely closed
      expect(screen.getByRole('button', { name: '關閉詢價' })).toBeInTheDocument()
      expect(screen.queryByText('已關閉')).not.toBeInTheDocument()
    })

    it('still renders ChatInput (message-send path intact) alongside the header', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          onCloseLead={vi.fn()}
        />,
      )

      expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    })
  })

  describe('artist budget-range display (HAR-531)', () => {
    beforeEach(() => {
      mockUseRealtimeMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        sendMessage: makeSendMessage(),
        refetch: vi.fn(),
      })
    })

    it('renders the localized budget label for a known code (not the raw code)', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          budgetRange="8k_20k"
        />,
      )

      expect(screen.getByText('預算範圍：8,000–20,000')).toBeInTheDocument()
      expect(screen.queryByText('8k_20k')).not.toBeInTheDocument()
    })

    it('renders the notSpecified copy (未提供) when budget_range is null', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          budgetRange={null}
        />,
      )

      expect(screen.getByText('預算範圍：未提供')).toBeInTheDocument()
    })

    it('falls back to notSpecified for an unknown/legacy code (never the raw code)', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="artist-1"
          isArtist={true}
          status="pending"
          budgetRange="legacy_9000"
        />,
      )

      expect(screen.getByText('預算範圍：未提供')).toBeInTheDocument()
      expect(screen.queryByText(/legacy_9000/)).not.toBeInTheDocument()
    })

    it('does NOT show the budget line to a consumer', () => {
      render(
        <ChatWindow
          inquiryId="inq-1"
          currentUserId="user-1"
          isArtist={false}
          status="pending"
          budgetRange="8k_20k"
        />,
      )

      expect(screen.queryByText(/預算範圍/)).not.toBeInTheDocument()
    })
  })
})
