'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import type { ChatListItem } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { QuoteFormModal } from '@/components/chat/QuoteFormModal'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'
import type { Inquiry } from '@/types/database'
import type { SendQuoteRequest } from '@/types/chat'

// TopBar: h-12 (48px) mobile, h-14 (56px) desktop + bottom tab h-16 (64px) on mobile
const CHAT_HEIGHT_CLASSES = 'h-[calc(100dvh-48px-64px)] lg:h-[calc(100dvh-56px)]'

// 'all' omits the status query param; the rest map 1:1 to /api/inquiries?status=
type StatusFilter = 'all' | Inquiry['status']

const STATUS_FILTERS: { value: StatusFilter; label: string; emptyCopy: string }[] = [
  { value: 'all', label: '全部', emptyCopy: '還沒有任何詢價' },
  { value: 'pending', label: '待回覆', emptyCopy: '目前沒有待回覆的詢價' },
  { value: 'quoted', label: '已報價', emptyCopy: '目前沒有已報價的詢價' },
  { value: 'accepted', label: '已接受', emptyCopy: '目前沒有已接受的詢價' },
  { value: 'closed', label: '已關閉', emptyCopy: '目前沒有已關閉的詢價' },
]

export default function InquiriesPage() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<ChatListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isClosing, setIsClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const fetchInquiries = useCallback(async () => {
    try {
      const url =
        statusFilter === 'all'
          ? '/api/inquiries?role=artist'
          : `/api/inquiries?role=artist&status=${statusFilter}`
      const response = await fetch(url)
      if (!response.ok) {
        setIsLoading(false)
        return
      }
      const data = await response.json()
      setInquiries(
        (data.data ?? []).map((inq: Inquiry) => ({
          inquiry: inq,
          artist_display_name: '',
          artist_avatar_url: null,
          consumer_name: inq.consumer_name,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
        })),
      )
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  useEffect(() => {
    fetch('/api/artists/me/templates')
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((data: { templates?: QuoteTemplate[] }) =>
        setTemplates(data.templates ?? []),
      )
      .catch(() => {})
  }, [])

  const handleSendQuote = useCallback(
    async (data: SendQuoteRequest) => {
      if (!selectedId) return
      const res = await fetch(`/api/inquiries/${selectedId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to send quote')
    },
    [selectedId],
  )

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      if (!selectedId) return
      try {
        const response = await fetch(`/api/inquiries/${selectedId}/quotes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote_id: quoteId, status: action }),
        })
        if (!response.ok) throw new Error(`Quote action failed: ${response.status}`)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Quote action failed')
      }
    },
    [selectedId],
  )

  const handleCloseLead = useCallback(async () => {
    if (!selectedId) return
    setIsClosing(true)
    setCloseError(null)
    try {
      const response = await fetch(`/api/inquiries/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!response.ok) throw new Error(`Close failed: ${response.status}`)
      // Reflect closure locally so the list badge + dimming update without reload.
      setInquiries((prev) =>
        prev.map((item) =>
          item.inquiry.id === selectedId
            ? { ...item, inquiry: { ...item.inquiry, status: 'closed' } }
            : item,
        ),
      )
    } catch {
      setCloseError('關閉失敗，請稍後再試')
    } finally {
      setIsClosing(false)
    }
  }, [selectedId])

  // Reset transient close UI when switching threads.
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setCloseError(null)
  }, [])

  const selectedItem = inquiries.find((item) => item.inquiry.id === selectedId)
  const activeFilter =
    STATUS_FILTERS.find((f) => f.value === statusFilter) ?? STATUS_FILTERS[0]

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center text-[#F5F0EB]/40 ${CHAT_HEIGHT_CLASSES}`}>
        載入中...
      </div>
    )
  }

  return (
    <div className={`flex bg-[#0A0A0A] ${CHAT_HEIGHT_CLASSES}`}>
      {/* Chat list — full width on mobile, fixed 320px on desktop */}
      <div
        className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-[#2A2A2A]`}
      >
        <div className="px-4 py-3 border-b border-[#2A2A2A]">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-display text-lg font-semibold text-[#F5F0EB]">
              詢價管理
            </h1>
            <span className="text-[12px] text-[#F5F0EB]/40 shrink-0">
              {activeFilter.label} · {inquiries.length}
            </span>
          </div>
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {STATUS_FILTERS.map((filter) => {
              const isActive = filter.value === statusFilter
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#C8A97E] text-[#0A0A0A]'
                      : 'border border-[#2A2A2A] text-[#F5F0EB]/60 hover:text-[#F5F0EB]'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
        {inquiries.length === 0 ? (
          <div className="p-8 text-center text-[#F5F0EB]/40 text-sm">
            {activeFilter.emptyCopy}
          </div>
        ) : (
          <ChatList
            items={inquiries}
            selectedId={selectedId}
            onSelect={handleSelect}
            viewAs="artist"
          />
        )}
      </div>

      {/* Chat window — hidden on mobile until a thread is selected */}
      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
        {selectedId && user ? (
          <>
            {/* Mobile back navigation */}
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-[#2A2A2A]">
              <button
                onClick={() => setSelectedId(null)}
                className="text-[#F5F0EB]/60 hover:text-[#F5F0EB] text-sm transition-colors"
                aria-label="返回列表"
              >
                ← 返回
              </button>
            </div>
            <ChatWindow
              inquiryId={selectedId}
              currentUserId={user.lineUserId}
              isArtist={true}
              onSendQuote={() => setQuoteModalOpen(true)}
              onQuoteAction={handleQuoteAction}
              status={selectedItem?.inquiry.status}
              onCloseLead={handleCloseLead}
              isClosing={isClosing}
              closeError={closeError}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#F5F0EB]/30 text-sm">
            選擇一個對話開始聊天
          </div>
        )}
      </div>

      {/* Quote form modal — triggered by the $ button in ChatInput */}
      {selectedId && (
        <QuoteFormModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          consumerName={selectedItem?.consumer_name ?? ''}
          inquiryDescription={selectedItem?.inquiry.description ?? ''}
          templates={templates}
          onSubmit={handleSendQuote}
        />
      )}
    </div>
  )
}
