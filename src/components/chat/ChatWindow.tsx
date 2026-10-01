'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { BookingPanel } from '@/components/booking/BookingPanel'
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
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => Promise<void> | void
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
  const { messages, isLoading, error, sendMessage, refetch } = useRealtimeMessages(inquiryId)
  const en = useLocale() === 'en'
  const t = useTranslations('inquiry.budgetRange')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [liveStatus, setLiveStatus] = useState<Inquiry['status'] | undefined>(status)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/inquiries/${inquiryId}`).then(async response => {
      if (!response.ok) return
      const data = await response.json()
      if (!cancelled && data.inquiry?.status) setLiveStatus(data.inquiry.status)
    }).catch(() => { /* message retry remains available */ })
    return () => { cancelled = true }
  }, [inquiryId, messages.length, status])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[#20241F]/40">
        載入中...
      </div>
    )
  }

  const effectiveStatus = status === 'closed' || liveStatus === 'closed' ? 'closed'
    : status === 'accepted' || liveStatus === 'accepted' ? 'accepted'
    : liveStatus ?? status
  const isClosed = effectiveStatus === 'closed'
  const budgetLabel =
    budgetRange && BUDGET_RANGE_CODES.has(budgetRange)
      ? t(`options.${budgetRange}`)
      : t('notSpecified')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && <p role="alert" className="bg-destructive/10 p-3 text-sm text-destructive">{en ? "Could not refresh messages." : "訊息暫時無法更新。"} <button className="underline" onClick={() => void refetch()}>{en ? "Retry" : "重試"}</button></p>}
      {isArtist && (
        <div className="border-b border-[#DEDFD7] bg-[#F7F6F2] px-4 py-2.5">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-[12px] leading-snug text-[#20241F]/40">
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
                className="shrink-0 rounded-full border border-[#DEDFD7] px-3 py-1 text-[12px] font-medium text-[#20241F]/60 transition-colors hover:border-[#555555] hover:text-[#20241F] disabled:opacity-50"
              >
                {isClosing ? '關閉中…' : '關閉詢價'}
              </button>
            )}
          </div>
          <p className="mx-auto mt-1 max-w-2xl text-[12px] text-[#20241F]/40">
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
              onQuoteAction={onQuoteAction ? async (quoteId, action) => { await onQuoteAction(quoteId, action); await refetch() } : undefined}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4"><BookingPanel inquiryId={inquiryId} isArtist={isArtist} inquiryStatus={effectiveStatus} /></div>
      <ChatInput
        onSendMessage={sendMessage}
        onSendQuote={effectiveStatus === 'accepted' || isClosed ? undefined : onSendQuote}
        disabled={isClosed}
        isArtist={isArtist}
      />
    </div>
  )
}
