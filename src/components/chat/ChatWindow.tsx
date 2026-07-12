'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import type { Inquiry } from '@/types/database'

const NEXT_STEP_COPY = '先回覆需求，再送報價；成交或不適合時可關閉詢價。'

// The budget-range codes an asker can pick (Slice B / HAR-529 owns their
// labels). An inquiry whose stored code is not in this set (null, legacy, or
// unknown) falls back to the notSpecified copy — never renders the raw code.
const BUDGET_RANGE_CODES: ReadonlySet<string> = new Set([
  'under_3k',
  '3k_8k',
  '8k_20k',
  '20k_50k',
  'over_50k',
  'unsure',
])

interface ChatWindowProps {
  readonly inquiryId: string
  readonly currentUserId: string
  readonly isArtist: boolean
  readonly onSendQuote?: () => void
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
  /** Current inquiry status — drives the artist close-lead header. */
  readonly status?: Inquiry['status']
  /** Artist-only: close the lead (PATCH status=closed). */
  readonly onCloseLead?: () => void
  /** Whether a close request is in flight (disables the action). */
  readonly isClosing?: boolean
  /** Visible error message if the last close attempt failed. */
  readonly closeError?: string | null
  /** Asker's budget-range code (nullable) — shown to the artist for triage. */
  readonly budgetRange?: string | null
}

export function ChatWindow({
  inquiryId,
  currentUserId,
  isArtist,
  onSendQuote,
  onQuoteAction,
  status,
  onCloseLead,
  isClosing,
  closeError,
  budgetRange,
}: ChatWindowProps) {
  const { messages, isLoading, sendMessage, refetch } = useRealtimeMessages(inquiryId)
  const t = useTranslations('inquiry.budgetRange')
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      if (onQuoteAction) {
        try {
          await onQuoteAction(quoteId, action)
          // Refetch messages to update the quote status in the UI
          await refetch()
        } catch {
          // Silently handle error; the parent can handle error display if needed
        }
      }
    },
    [onQuoteAction, refetch],
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[#F5F0EB]/40">
        載入中...
      </div>
    )
  }

  const isClosed = status === 'closed'
  const budgetLabel =
    budgetRange && BUDGET_RANGE_CODES.has(budgetRange)
      ? t(`options.${budgetRange}`)
      : t('notSpecified')

  return (
    <div className="flex flex-col h-full">
      {isArtist && (
        <div className="border-b border-[#2A2A2A] bg-[#0A0A0A] px-4 py-2.5">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-[12px] leading-snug text-[#F5F0EB]/40">
              {NEXT_STEP_COPY}
            </p>
            {isClosed ? (
              <span className="shrink-0 text-[12px] font-medium text-[#555555]">
                已關閉
              </span>
            ) : (
              <button
                type="button"
                onClick={onCloseLead}
                disabled={isClosing}
                className="shrink-0 rounded-full border border-[#2A2A2A] px-3 py-1 text-[12px] font-medium text-[#F5F0EB]/60 transition-colors hover:border-[#555555] hover:text-[#F5F0EB] disabled:opacity-50"
              >
                {isClosing ? '關閉中…' : '關閉詢價'}
              </button>
            )}
          </div>
          <p className="mx-auto mt-1 max-w-2xl text-[12px] text-[#F5F0EB]/40">
            預算範圍：{budgetLabel}
          </p>
          {closeError && (
            <p className="mx-auto mt-1 max-w-2xl text-[12px] text-[#E25C5C]" role="alert">
              {closeError}
            </p>
          )}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto max-w-2xl space-y-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              onQuoteAction={handleQuoteAction}
            />
          ))}
        </div>
      </div>
      <ChatInput
        onSendMessage={sendMessage}
        onSendQuote={onSendQuote}
        isArtist={isArtist}
      />
    </div>
  )
}
