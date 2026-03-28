'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { QuoteFormModal } from '@/components/chat/QuoteFormModal'
import type { Inquiry } from '@/types/database'
import type { SendQuoteRequest } from '@/types/chat'

interface ChatListItem {
  inquiry: Inquiry
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<ChatListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)

  const fetchInquiries = useCallback(async () => {
    try {
      const response = await fetch('/api/inquiries?role=artist')
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
  }, [])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      if (!selectedId) return
      await fetch(`/api/inquiries/${selectedId}/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: action }),
      })
    },
    [selectedId],
  )

  const handleSendQuote = useCallback(
    async (data: SendQuoteRequest) => {
      if (!selectedId) return
      const response = await fetch(`/api/inquiries/${selectedId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Quote submission failed')
      }
    },
    [selectedId],
  )

  const selectedInquiry = inquiries.find((item) => item.inquiry.id === selectedId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      {/* Chat list */}
      <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-[#1F1F1F]`}>
        <div className="p-4 border-b border-[#1F1F1F]">
          <h1 className="text-lg font-semibold text-[#F5F0EB]">詢價管理</h1>
        </div>
        <ChatList
          items={inquiries}
          selectedId={selectedId}
          onSelect={setSelectedId}
          viewAs="artist"
        />
      </div>

      {/* Chat window */}
      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
        {selectedId && user ? (
          <>
            <div className="lg:hidden flex items-center p-3 border-b border-[#1F1F1F]">
              <button
                onClick={() => setSelectedId(null)}
                className="text-[#F5F0EB]/60 text-sm"
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
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#F5F0EB]/30">
            選擇一個對話開始聊天
          </div>
        )}
      </div>

      {/* Quote form modal */}
      {selectedId && (
        <QuoteFormModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          inquiryId={selectedId}
          consumerName={selectedInquiry?.consumer_name ?? ''}
          inquiryDescription={selectedInquiry?.inquiry.description ?? ''}
          templates={[]}
          onSubmit={handleSendQuote}
        />
      )}
    </div>
  )
}
