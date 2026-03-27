'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'

export default function ConsumerInquiriesPage() {
  const { isLoggedIn, isLoading: authLoading, loginWithRedirect } = useAuth()
  const router = useRouter()
  const [inquiries, setInquiries] = useState<
    ReadonlyArray<{
      inquiry: { id: string; [key: string]: unknown }
      artist_display_name: string
      artist_avatar_url: string | null
      consumer_name: string | null
      last_message: string | null
      last_message_at: string | null
      unread_count: number
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      loginWithRedirect('/inquiries')
      return
    }

    async function load() {
      try {
        const res = await fetch('/api/inquiries?role=consumer')
        const data = await res.json()
        setInquiries(
          (data.data ?? []).map((inq: Record<string, unknown>) => ({
            inquiry: inq,
            artist_display_name:
              (inq.artist_display_name as string) ?? '刺青師',
            artist_avatar_url:
              (inq.artist_avatar_url as string | null) ?? null,
            consumer_name: null,
            last_message: null,
            last_message_at: null,
            unread_count: 0,
          })),
        )
      } catch {
        // Silently handle fetch failure; list remains empty
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isLoggedIn, authLoading, loginWithRedirect])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-lg mx-auto">
        <div className="p-4 border-b border-[#1F1F1F]">
          <h1 className="text-lg font-semibold text-[#F5F0EB]">我的詢價</h1>
        </div>
        <ChatList
          items={inquiries as Parameters<typeof ChatList>[0]['items']}
          selectedId={null}
          onSelect={(id) => router.push(`/inquiries/${id}`)}
          viewAs="consumer"
        />
      </div>
    </div>
  )
}
