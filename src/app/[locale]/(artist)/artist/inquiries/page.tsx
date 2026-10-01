'use client'

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import type { ChatListItem } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { QuoteFormModal } from '@/components/chat/QuoteFormModal'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'
import type { Inquiry } from '@/types/database'
import type { SendQuoteRequest } from '@/types/chat'
import { compareByBudgetDesc } from '@/lib/inquiries/budget-triage'

// TopBar: h-12 (48px) mobile, h-14 (56px) desktop + bottom tab h-16 (64px) on mobile
const CHAT_HEIGHT_CLASSES = 'h-[calc(100dvh-72px-64px)] lg:h-[calc(100dvh-72px)]'

// 'all' omits the status query param; the rest map 1:1 to /api/inquiries?status=
type StatusFilter = 'all' | Inquiry['status']

// Client-side ordering of the already-fetched list. 'recent' keeps the fetch
// order (server default); 'budget' re-sorts highest-budget-first via HAR-711's
// comparator. Additive — does NOT touch statusFilter or trigger a refetch.
type SortBy = 'recent' | 'budget'

const SORT_OPTIONS: { value: SortBy; labelKey: 'recent' | 'budget' }[] = [
  { value: 'recent', labelKey: 'recent' },
  { value: 'budget', labelKey: 'budget' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string; emptyCopy: string }[] = [
  { value: 'all', label: '全部', emptyCopy: '還沒有任何詢價' },
  { value: 'pending', label: '待回覆', emptyCopy: '目前沒有待回覆的詢價' },
  { value: 'quoted', label: '已報價', emptyCopy: '目前沒有已報價的詢價' },
  { value: 'accepted', label: '已接受', emptyCopy: '目前沒有已接受的詢價' },
  { value: 'closed', label: '已關閉', emptyCopy: '目前沒有已關閉的詢價' },
]

export default function InquiriesPage() {
  return <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">載入詢價中…</div>}><InquiriesContent /></Suspense>
}

function InquiriesContent() {
  const { user, artist } = useAuth()
  const requestedInquiry = useSearchParams()?.get('inquiry') ?? null
  const appliedInquiry = useRef<string | null>(null)
  const loadController = useRef<AbortController | null>(null)
  const tSort = useTranslations('inquiry.inboxSort')
  const [inquiries, setInquiries] = useState<ChatListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [isClosing, setIsClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const fetchInquiries = useCallback(async () => {
    if (requestedInquiry && !artist?.id) return
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller
    const isCurrent = () => !controller.signal.aborted && loadController.current === controller
    setIsLoading(true)
    setLoadError(null)
    try {
      const url =
        statusFilter === 'all'
          ? '/api/inquiries?role=artist'
          : `/api/inquiries?role=artist&status=${statusFilter}`
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`Unable to load inquiries (${response.status})`)
      const data = await response.json()
      if (!isCurrent()) return
      const rows: Inquiry[] = data.data ?? []
      // Calendar links may address an older case beyond the first inbox page.
      // Fetch it through the existing participant-authorized detail endpoint.
      if (requestedInquiry && appliedInquiry.current !== requestedInquiry) {
        try {
          let requested = rows.find(inquiry => inquiry.id === requestedInquiry)
          if (!requested) {
            const detailResponse = await fetch(`/api/inquiries/${encodeURIComponent(requestedInquiry)}`, { signal: controller.signal })
            if (!detailResponse.ok) throw new Error('Unable to open requested inquiry')
            const detail: { inquiry: Inquiry } = await detailResponse.json()
            if (!isCurrent()) return
            if (detail.inquiry.artist_id !== artist?.id) throw new Error('Inquiry belongs to another artist')
            requested = detail.inquiry
            rows.unshift(requested)
          }
          setSelectedId(requested.id)
          setDeepLinkError(null)
        } catch {
          if (!isCurrent()) return
          setSelectedId(null)
          setDeepLinkError('無法開啟指定詢價，請從列表選擇其他對話。')
        }
        appliedInquiry.current = requestedInquiry
      }
      if (!isCurrent()) return
      setInquiries(
        rows.map((inq: Inquiry) => ({
          inquiry: inq,
          artist_display_name: '',
          artist_avatar_url: null,
          consumer_name: inq.consumer_name,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
        })),
      )
    } catch {
      if (isCurrent()) setLoadError('無法載入詢價，請檢查連線後重新載入。')
    } finally {
      if (isCurrent()) setIsLoading(false)
    }
  }, [statusFilter, requestedInquiry, artist?.id])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchInquiries() }, 0)
    return () => { window.clearTimeout(timer); loadController.current?.abort() }
  }, [fetchInquiries])

  useEffect(() => {
    fetch('/api/artists/me/templates')
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load quote templates')
        return res.json()
      })
      .then((data: { templates?: QuoteTemplate[] }) => {
        if (data.templates != null && !Array.isArray(data.templates)) throw new Error('Invalid quote templates')
        setTemplates(data.templates ?? [])
      })
      .catch(() => setTemplatesError('常用報價範本暫時無法載入，仍可手動建立報價。'))
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

  // Purely client-side re-sort of the already-fetched list. 'recent' keeps the
  // server (fetch) order untouched; 'budget' copies before sorting so toggling
  // back to 'recent' restores the original order. Stable sort keeps ties (incl.
  // null/unsure budgets, which the comparator ranks last) in fetch order.
  const displayedInquiries = useMemo(
    () =>
      sortBy === 'budget'
        ? [...inquiries].sort((a, b) => compareByBudgetDesc(a.inquiry, b.inquiry))
        : inquiries,
    [inquiries, sortBy],
  )

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center text-[#20241F]/40 ${CHAT_HEIGHT_CLASSES}`}>
        載入中...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 bg-[#F7F6F2] px-6 text-center text-sm text-[#20241F] ${CHAT_HEIGHT_CLASSES}`}>
        <p role="alert">{loadError}</p>
        <button type="button" onClick={fetchInquiries} className="h-11 rounded-lg bg-[#53614A] px-4 font-medium text-[#F7F6F2] hover:bg-[#3E4B36]">重新載入</button>
      </div>
    )
  }

  return (
    <div className={`flex bg-[#F7F6F2] ${CHAT_HEIGHT_CLASSES}`}>
      {/* Chat list — full width on mobile, fixed 320px on desktop */}
      <div
        className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-[#DEDFD7]`}
      >
        <div className="px-4 py-3 border-b border-[#DEDFD7]">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-display text-lg font-semibold text-[#20241F]">
              詢價管理
            </h1>
            <span className="text-[12px] text-[#20241F]/40 shrink-0">
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
                      ? 'bg-[#53614A] text-[#F7F6F2]'
                      : 'border border-[#DEDFD7] text-[#20241F]/60 hover:text-[#20241F]'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
          {/* Sort toggle — additive client-side re-order, no refetch */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = option.value === sortBy
              return (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  aria-pressed={isActive}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#53614A] text-[#F7F6F2]'
                      : 'border border-[#DEDFD7] text-[#20241F]/60 hover:text-[#20241F]'
                  }`}
                >
                  {tSort(option.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
        {deepLinkError && <p role="alert" className="border-b border-border bg-muted px-4 py-3 text-sm text-muted-foreground">{deepLinkError}</p>}
        {inquiries.length === 0 ? (
          <div className="p-8 text-center text-[#20241F]/40 text-sm">
            {activeFilter.emptyCopy}
          </div>
        ) : (
          <ChatList
            items={displayedInquiries}
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
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-[#DEDFD7]">
              <button
                onClick={() => setSelectedId(null)}
                className="text-[#20241F]/60 hover:text-[#20241F] text-sm transition-colors"
                aria-label="返回列表"
              >
                ← 返回
              </button>
            </div>
            <ChatWindow
              key={selectedId}
              inquiryId={selectedId}
              currentUserId={user.lineUserId}
              isArtist={true}
              onSendQuote={() => setQuoteModalOpen(true)}
              onQuoteAction={handleQuoteAction}
              status={selectedItem?.inquiry.status}
              budgetRange={selectedItem?.inquiry.budget_range ?? null}
              onCloseLead={handleCloseLead}
              isClosing={isClosing}
              closeError={closeError}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#20241F]/30 text-sm">
            選擇一個對話開始聊天
          </div>
        )}
      </div>

      {/* Quote form modal — triggered by the $ button in ChatInput */}
      {selectedId && (
        <>
          {templatesError && quoteModalOpen && <p role="status" className="fixed bottom-4 right-4 z-50 rounded-lg border border-[#DEDFD7] bg-[#FFFFFF] px-3 py-2 text-xs text-[#20241F]/70 shadow-sm">{templatesError}</p>}
          <QuoteFormModal
            open={quoteModalOpen}
            onOpenChange={setQuoteModalOpen}
            consumerName={selectedItem?.consumer_name ?? ''}
            inquiryDescription={selectedItem?.inquiry.description ?? ''}
            templates={templates}
            onSubmit={handleSendQuote}
          />
        </>
      )}
    </div>
  )
}
