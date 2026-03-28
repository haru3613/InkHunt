'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { StatCard } from '@/components/artists/StatCard'
import { OnboardingChecklist } from '@/components/artists/OnboardingChecklist'

interface InquirySummary {
  id: string
  consumer_name: string | null
  description: string
  body_part: string | null
  status: 'pending' | 'quoted' | 'accepted' | 'closed'
  created_at: string
}

export default function DashboardPage() {
  const { user, artist } = useAuth()
  const [inquiries, setInquiries] = useState<InquirySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchInquiries() {
      try {
        const response = await fetch('/api/inquiries?role=artist')
        if (!response.ok) return
        const data = await response.json()
        setInquiries(data.data ?? [])
      } finally {
        setIsLoading(false)
      }
    }
    fetchInquiries()
  }, [])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-6 lg:px-10 lg:py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[#141414]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[12px] bg-[#141414]" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-[12px] bg-[#141414]" />
      </div>
    )
  }

  const displayName = artist?.display_name ?? user?.displayName ?? ''
  const hasProfile = Boolean(artist?.display_name)
  const hasPricing = false // determined at render time, not critical for overview
  const portfolioCount = 0 // TODO: fetch from API

  // No inquiries → show onboarding checklist
  if (inquiries.length === 0) {
    return (
      <OnboardingChecklist
        hasProfile={hasProfile}
        portfolioCount={portfolioCount}
        hasPricing={hasPricing}
        artistSlug={artist?.slug ?? null}
      />
    )
  }

  const pending = inquiries.filter((i) => i.status === 'pending').length
  const quoted = inquiries.filter((i) => i.status === 'quoted').length
  const closed = inquiries.filter(
    (i) => i.status === 'accepted' || i.status === 'closed',
  ).length
  const recent = inquiries.slice(0, 5)

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6 lg:px-10 lg:py-8">
      {/* Greeting */}
      <h1 className="font-display text-[24px] font-semibold text-[#F5F0EB]">
        歡迎回來，{displayName}
      </h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="待處理詢價"
          value={pending}
          highlighted={pending > 0}
          href="/artist/inquiries"
        />
        <StatCard label="已報價" value={quoted} href="/artist/inquiries" />
        <StatCard label="已完成" value={closed} />
      </div>

      {/* Recent inquiries */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-[#8A8A8A]">
            最新詢價
          </h2>
          <Link
            href="/artist/inquiries"
            className="font-sans text-[14px] text-[#C8A97E] transition-colors duration-200 hover:text-[#E8D5B5]"
          >
            查看全部 →
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-[12px] border border-[#2A2A2A] bg-[#141414]">
          {recent.map((inquiry, index) => {
            const isPending = inquiry.status === 'pending'
            const label =
              inquiry.body_part ?? truncate(inquiry.description, 40)

            return (
              <Link
                key={inquiry.id}
                href={`/artist/inquiries` as Parameters<typeof Link>[0]['href']}
                className={`group flex items-start gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[#1C1C1C] ${
                  index < recent.length - 1 ? 'border-b border-[#2A2A2A]' : ''
                }`}
              >
                <div
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    isPending ? 'bg-[#C8A97E]' : 'bg-transparent'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-[#F5F0EB]">
                      {inquiry.consumer_name ?? '匿名用戶'}
                    </span>
                    <span className="shrink-0 text-[12px] text-[#555555]">
                      {formatRelativeTime(inquiry.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[#8A8A8A]">
                    {label}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-[#8A8A8A]">
          快速操作
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/artist/portfolio"
            className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#C8A97E] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
          >
            上傳作品
          </Link>
          <Link
            href="/artist/profile"
            className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#C8A97E] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
          >
            編輯檔案
          </Link>
          {artist?.slug && (
            <Link
              href={`/artists/${artist.slug}` as Parameters<typeof Link>[0]['href']}
              className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#C8A97E] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
            >
              分享 Profile 連結
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
