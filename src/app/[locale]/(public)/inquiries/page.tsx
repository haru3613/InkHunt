'use client'

import { useState, useEffect, useCallback } from 'react'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import type { Inquiry } from '@/types/database'

// 'all' omits the status query param; the rest map 1:1 to /api/inquiries?status=.
type StatusFilter = 'all' | Inquiry['status']

// labelKey / emptyKey are inquiry.filters.* keys (added in Slice C, HAR-508).
const STATUS_FILTERS: { value: StatusFilter; labelKey: string; emptyKey: string }[] = [
  { value: 'all', labelKey: 'filters.all', emptyKey: 'filters.emptyAll' },
  { value: 'pending', labelKey: 'filters.pending', emptyKey: 'filters.emptyPending' },
  { value: 'quoted', labelKey: 'filters.quoted', emptyKey: 'filters.emptyQuoted' },
  { value: 'accepted', labelKey: 'filters.accepted', emptyKey: 'filters.emptyAccepted' },
  { value: 'closed', labelKey: 'filters.closed', emptyKey: 'filters.emptyClosed' },
]

export default function ConsumerInquiriesPage() {
  const { isLoggedIn, isLoading: authLoading, loginWithRedirect } = useAuth()
  const router = useRouter()
  const t = useTranslations('inquiry')
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const fetchInquiries = useCallback(async () => {
    try {
      const url =
        statusFilter === 'all'
          ? '/api/inquiries?role=consumer'
          : `/api/inquiries?role=consumer&status=${statusFilter}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      setInquiries(
        (data.data ?? []).map((inq: Record<string, unknown>) => ({
          inquiry: inq,
          artist_display_name: (inq.artist_display_name as string) ?? t('defaultArtistName'),
          artist_avatar_url: (inq.artist_avatar_url as string | null) ?? null,
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
  }, [statusFilter, t])

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      loginWithRedirect('/inquiries')
      return
    }
    fetchInquiries()
  }, [isLoggedIn, authLoading, loginWithRedirect, fetchInquiries])

  const activeFilter =
    STATUS_FILTERS.find((f) => f.value === statusFilter) ?? STATUS_FILTERS[0]

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
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-lg font-semibold text-[#F5F0EB]">{t('myInquiries')}</h1>
            <span className="text-[12px] text-[#F5F0EB]/40 shrink-0">
              {t(activeFilter.labelKey)} · {inquiries.length}
            </span>
          </div>
          {/* Status filter chips */}
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
                  {t(filter.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
        {inquiries.length === 0 ? (
          <div className="p-8 text-center text-[#F5F0EB]/40 text-sm">
            {t(activeFilter.emptyKey)}
          </div>
        ) : (
          <ChatList
            items={inquiries as Parameters<typeof ChatList>[0]['items']}
            selectedId={null}
            onSelect={(id) => router.push(`/inquiries/${id}`)}
            viewAs="consumer"
          />
        )}
      </div>
    </div>
  )
}
