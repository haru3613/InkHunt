'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { Inquiry } from '@/types/database'

// Height of the artist dashboard top bar (56px)
const TOPBAR_HEIGHT = 56

interface ChatListItem {
  inquiry: Inquiry
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export default function InquiriesPage() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<ChatListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center text-[#F5F0EB]/40"
        style={{ height: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}
      >
        載入中...
      </div>
    )
  }

  return (
    <div
      className="flex bg-[#0A0A0A]"
      style={{ height: `calc(100vh - ${TOPBAR_HEIGHT}px)` }}
    >
      {/* Chat list — full width on mobile, fixed 320px on desktop */}
      <div
        className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-[#2A2A2A]`}
      >
        <div className="px-4 py-3 border-b border-[#2A2A2A]">
          <h1 className="font-display text-lg font-semibold text-[#F5F0EB]">
            詢價管理
          </h1>
        </div>
        <ChatList
          items={inquiries}
          selectedId={selectedId}
          onSelect={setSelectedId}
          viewAs="artist"
        />
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
              onQuoteAction={handleQuoteAction}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#F5F0EB]/30 text-sm">
            選擇一個對話開始聊天
          </div>
        )}
      </div>
    </div>
  )
}
