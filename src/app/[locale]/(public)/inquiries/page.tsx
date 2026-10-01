'use client'

import { useState, useEffect, useCallback } from 'react'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter, Link } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { LineNotificationHint } from '@/components/shared/LineNotificationHint'
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
  const locale = useLocale()
  const en = locale === 'en'
  const [error, setError] = useState(false)
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
      if (!res.ok) throw new Error("Unable to load inquiries")
      const data = await res.json()
      setError(false)
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
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      return
    }
    const timer = setTimeout(() => { void fetchInquiries() }, 0)
    return () => clearTimeout(timer)
  }, [isLoggedIn, authLoading, loginWithRedirect, fetchInquiries])

  const activeFilter =
    STATUS_FILTERS.find((f) => f.value === statusFilter) ?? STATUS_FILTERS[0]

  if (!authLoading && !isLoggedIn) return <div className="v2-container py-14"><h1 className="text-3xl font-semibold">{t('myInquiries')}</h1><div className="mt-8 rounded-xl border border-border bg-card px-6 py-16 text-center"><h2 className="text-xl font-semibold">{en ? 'Keep your conversations in one place.' : '把想法與回覆，留在同一個地方。'}</h2><p className="mt-4 text-muted-foreground">{en ? 'Log in to view your inquiries and arrange appointments. It is free.' : '登入即可查看詢價、接收回覆並討論預約，全程免費。'}</p><button onClick={() => loginWithRedirect(`/${locale}/inquiries`)} className="v2-button mt-7">{en ? 'Log in with LINE' : '使用 LINE 登入'}</button></div></div>

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F6F2] text-[#20241F]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <div className="max-w-3xl mx-auto py-10">
        <div className="p-4 border-b border-[#DEDFD7]">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-3xl font-semibold text-[#20241F]">{t('myInquiries')}</h1>
            <span className="text-[12px] text-[#20241F]/40 shrink-0">
              {t(activeFilter.labelKey)} · {inquiries.length}
            </span>
          </div>
          <LineNotificationHint />
          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {STATUS_FILTERS.map((filter) => {
              const isActive = filter.value === statusFilter
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  aria-pressed={isActive}
                  className={`min-h-11 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#53614A] text-[#F7F6F2]'
                      : 'border border-[#DEDFD7] text-[#20241F]/60 hover:text-[#20241F]'
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
        {error ? <div role="alert" className="p-8 text-center"><p>{en ? "Could not load inquiries. Your conversations are safe." : "無法載入詢價，請稍後重試。"}</p><button className="v2-button secondary mt-5" onClick={fetchInquiries}>{en ? "Retry" : "重試"}</button></div> : inquiries.length === 0 ? (
          <div className="p-8 text-center text-[#20241F]/40 text-sm">
            {t(activeFilter.emptyKey)}
            <Link href="/explore" className="mt-6 block text-primary underline">{en ? 'Explore work' : '先去看看作品'}</Link>
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
