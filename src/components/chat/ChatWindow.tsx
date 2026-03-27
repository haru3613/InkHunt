'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'

interface ChatWindowProps {
  readonly inquiryId: string
  readonly currentUserId: string
  readonly isArtist: boolean
  readonly onSendQuote?: () => void
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

export function ChatWindow({
  inquiryId,
  currentUserId,
  isArtist,
  onSendQuote,
  onQuoteAction,
}: ChatWindowProps) {
  const { messages, isLoading, sendMessage } = useRealtimeMessages(inquiryId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
            onQuoteAction={onQuoteAction}
          />
        ))}
      </div>
      <ChatInput
        onSendMessage={sendMessage}
        onSendQuote={onSendQuote}
        isArtist={isArtist}
      />
    </div>
  )
}
