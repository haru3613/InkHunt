'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ArrowLeft } from 'lucide-react'
import type { Inquiry } from '@/types/database'

export default function ConsumerChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('inquiry')
  const locale = useLocale()
  const { user, isLoggedIn, isLoading: authLoading, loginWithRedirect } = useAuth()
  const [error, setError] = useState('')
  const [artistName, setArtistName] = useState('')
  const [status, setStatus] = useState<Inquiry['status'] | null>(null)

  // HAR-684: logged-out visitors used to get a blank page (`return null`) —
  // send them through LINE login and back to this chat, locale preserved.
  useEffect(() => {
    if (authLoading || isLoggedIn) return
    loginWithRedirect(`/${locale}/inquiries/${id}`)
  }, [authLoading, isLoggedIn, loginWithRedirect, locale, id])

  useEffect(() => {
    // Skip the guaranteed-401 fetch while logged out / redirecting to login
    if (!id || !isLoggedIn) return
    async function loadInquiry() {
      try {
        const res = await fetch(`/api/inquiries/${id}`)
        if (!res.ok) throw new Error(locale === "en" ? "This conversation is unavailable or you do not have access." : "無法開啟這則詢價，或你沒有查看權限。")
        if (res.ok) {
          const data = await res.json()
          setArtistName(
            (data.artist?.display_name as string | undefined) ?? t('defaultArtistName'),
          )
          setStatus(
            (data.inquiry?.status as Inquiry['status'] | undefined) ?? null,
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入詢價")
      }
    }
    loadInquiry()
  }, [id, isLoggedIn, t, locale])

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      const response = await fetch(`/api/inquiries/${id}/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: action }),
      })
      if (!response.ok) throw new Error(locale === 'en' ? 'Could not update quote. Please retry.' : '報價更新失敗，請重試。')
      setStatus(action === 'accepted' ? 'accepted' : 'pending')
    },
    [id, locale],
  )

  if (authLoading || !isLoggedIn || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F6F2] text-[#20241F]/40">
        Loading...
      </div>
    )
  }

  if (error) return <div role="alert" className="v2-container py-16"><p>{error}</p><button className="v2-button secondary mt-5" onClick={() => window.location.reload()}>{locale === "en" ? "Retry" : "重試"}</button></div>

  return (
    // HAR-684: h-screen overflowed the viewport under the public layout's
    // sticky header (h-14 = 56px) and fixed MobileNav (main pb-16 = 64px),
    // pushing the chat input off-screen on mobile. Same approach as the
    // artist inquiries page, offsets per this layout's chrome.
    <div className="flex flex-col h-[calc(100dvh-72px-80px)] lg:h-[calc(100dvh-72px)] bg-[#F7F6F2]">
      <div className="flex items-center gap-3 p-4 border-b border-[#DEDFD7]">
        <button
          aria-label={locale === "en" ? "Back to inquiries" : "回到我的詢價"}
          onClick={() => router.push('/inquiries')}
          className="text-[#20241F]/60"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#20241F]">{artistName}</h1>
      </div>
      {status && (
        <p className="px-4 py-2 text-[13px] text-[#20241F]/50 border-b border-[#DEDFD7]">
          {t(`nextStep.${status}`)}
        </p>
      )}
      <ChatWindow
        inquiryId={id}
        currentUserId={user.lineUserId}
        isArtist={false}
        status={status ?? undefined}
        onQuoteAction={handleQuoteAction}
      />
    </div>
  )
}
