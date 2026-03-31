import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Message } from '@/types/database'
import { ChatWindow } from '../ChatWindow'

vi.mock('@/hooks/useRealtimeMessages', () => ({
  useRealtimeMessages: vi.fn(),
}))

vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message }: { message: Message }) => (
    <div data-testid={`msg-${message.id}`}>{message.content}</div>
  ),
}))

vi.mock('../ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input" />,
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
})
