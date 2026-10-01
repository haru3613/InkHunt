'use client'

import { useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuoteCardProps {
  readonly quoteId: string
  readonly price: number
  readonly note: string | null
  readonly availableDates: string[] | null
  readonly status: string
  readonly isOwn: boolean
  readonly onAction?: (quoteId: string, action: 'accepted' | 'rejected') => void | Promise<void>
}

const copy = {
  'zh-TW': {
    unavailable: '報價已失效', title: '報價', dates: '可討論日期：', accept: '接受報價', reject: '婉拒', pending: '等待回應', viewed: '已讀',
    accepted: '已接受報價，請在聊天室安排預約日期。', rejected: '已婉拒', error: '更新報價狀態失敗，請重試。', saving: '處理中…',
  },
  en: {
    unavailable: 'Quote unavailable', title: 'Quote', dates: 'Dates to discuss:', accept: 'Accept quote', reject: 'Decline', pending: 'Awaiting response', viewed: 'Viewed',
    accepted: 'Quote accepted. Arrange the appointment date in chat.', rejected: 'Declined', error: 'Could not update the quote. Please try again.', saving: 'Saving…',
  },
} as const

export function QuoteCard({ quoteId, price, note, availableDates, status, isOwn, onAction }: QuoteCardProps) {
  const locale = useLocale()
  const text = copy[locale === 'en' ? 'en' : 'zh-TW']
  const [isActing, setIsActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const actionInFlight = useRef(false)
  const showActions = !isOwn && (status === 'sent' || status === 'viewed')
  const statusLabel = status === 'accepted' ? text.accepted : status === 'rejected' ? text.rejected : status === 'viewed' ? text.viewed : status === 'sent' ? text.pending : text.unavailable

  async function handleAction(action: 'accepted' | 'rejected') {
    if (!onAction || actionInFlight.current) return
    actionInFlight.current = true
    setIsActing(true)
    setActionError(null)
    try {
      await onAction(quoteId, action)
    } catch {
      setActionError(text.error)
    } finally {
      actionInFlight.current = false
      setIsActing(false)
    }
  }

  return (
    <div className="max-w-[80%] space-y-3 rounded-xl border border-[#53614A]/30 bg-[#DEDFD7] p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-[#53614A]">{text.title}</div>
      <div className="text-2xl font-bold text-[#20241F]">NT${price.toLocaleString()}</div>
      {note && <p className="text-sm text-[#20241F]/70">{note}</p>}
      {availableDates && availableDates.length > 0 && <div className="text-xs text-[#20241F]/50">{text.dates} {availableDates.join(', ')}</div>}
      {showActions ? (
        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Button onClick={() => handleAction('accepted')} disabled={isActing} className="flex-1 bg-[#53614A] text-[#F7F6F2] hover:bg-[#53614A]/90" size="sm">{isActing ? text.saving : text.accept}</Button>
            <Button onClick={() => handleAction('rejected')} disabled={isActing} variant="outline" className="flex-1 border-[#20241F]/20 text-[#20241F]" size="sm">{text.reject}</Button>
          </div>
          {actionError && <p role="alert" className="text-xs text-[#B44747]">{actionError}</p>}
        </div>
      ) : (
        <div className={cn('text-xs font-medium', status === 'accepted' ? 'text-[#3E7044]' : status === 'rejected' ? 'text-[#B44747]' : 'text-[#20241F]/40')}>
          {statusLabel}
        </div>
      )}
    </div>
  )
}
