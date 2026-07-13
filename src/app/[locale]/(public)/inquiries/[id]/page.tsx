'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ArrowLeft } from 'lucide-react'
import type { Inquiry } from '@/types/database'

export default function ConsumerChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('inquiry')
  const { user, isLoggedIn, isLoading: authLoading, loginWithRedirect } = useAuth()
  const [artistName, setArtistName] = useState('')
  const [status, setStatus] = useState<Inquiry['status'] | null>(null)

  // HAR-684: logged-out visitors used to get a blank page (`return null`) —
  // send them through LINE login and back to this chat.
  useEffect(() => {
    if (authLoading || isLoggedIn) return
    loginWithRedirect(`/inquiries/${id}`)
  }, [authLoading, isLoggedIn, loginWithRedirect, id])

  useEffect(() => {
    if (!id) return
    async function loadInquiry() {
      try {
        const res = await fetch(`/api/inquiries/${id}`)
        if (res.ok) {
          const data = await res.json()
          setArtistName(
            (data.artist?.display_name as string | undefined) ?? t('defaultArtistName'),
          )
          setStatus(
            (data.inquiry?.status as Inquiry['status'] | undefined) ?? null,
          )
        }
      } catch {
        // Silently handle fetch failure; artistName/status stay empty
      }
    }
    loadInquiry()
  }, [id, t])

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

  if (authLoading || !isLoggedIn || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    // HAR-684: h-screen overflowed the viewport under the sticky header (h-14
    // = 56px) and fixed MobileNav (main pb-16 = 64px), pushing the chat input
    // off-screen on mobile. Mirror the artist inquiries page height math.
    <div className="flex flex-col h-[calc(100dvh-56px-64px)] lg:h-[calc(100dvh-56px)] bg-[#0A0A0A]">
      <div className="flex items-center gap-3 p-4 border-b border-[#1F1F1F]">
        <button
          onClick={() => router.push('/inquiries')}
          className="text-[#F5F0EB]/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#F5F0EB]">{artistName}</h1>
      </div>
      {status && (
        <p className="px-4 py-2 text-[13px] text-[#F5F0EB]/50 border-b border-[#1F1F1F]">
          {t(`nextStep.${status}`)}
        </p>
      )}
      <ChatWindow
        inquiryId={id}
        currentUserId={user.lineUserId}
        isArtist={false}
        onQuoteAction={handleQuoteAction}
      />
    </div>
  )
}
