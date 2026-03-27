'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ArrowLeft } from 'lucide-react'

export default function ConsumerChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoggedIn, isLoading: authLoading } = useAuth()
  const [artistName, setArtistName] = useState('')

  useEffect(() => {
    if (!id) return
    async function loadInquiry() {
      try {
        const res = await fetch(`/api/inquiries/${id}`)
        if (res.ok) {
          const data = await res.json()
          setArtistName(
            (data.artist?.display_name as string | undefined) ?? '刺青師',
          )
        }
      } catch {
        // Silently handle fetch failure; artistName stays empty
      }
    }
    loadInquiry()
  }, [id])

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      await fetch(`/api/inquiries/${id}/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: action }),
      })
    },
    [id],
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  if (!isLoggedIn || !user) return null

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      <div className="flex items-center gap-3 p-4 border-b border-[#1F1F1F]">
        <button
          onClick={() => router.push('/inquiries')}
          className="text-[#F5F0EB]/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#F5F0EB]">{artistName}</h1>
      </div>
      <ChatWindow
        inquiryId={id}
        currentUserId={user.lineUserId}
        isArtist={false}
        onQuoteAction={handleQuoteAction}
      />
    </div>
  )
}
