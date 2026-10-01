'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { StatCard } from '@/components/artists/StatCard'
import { OnboardingChecklist } from '@/components/artists/OnboardingChecklist'
import { ArtistStatusBanner } from '@/components/artist/ArtistStatusBanner'

interface InquirySummary {
  id: string
  consumer_name: string | null
  description: string
  body_part: string | null
  status: 'pending' | 'quoted' | 'accepted' | 'closed'
  created_at: string
}

export default function DashboardPage() {
  const { artist } = useAuth()
  const [inquiries, setInquiries] = useState<InquirySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/inquiries?role=artist')
      if (!response.ok) throw new Error(`Unable to load inquiries (${response.status})`)
      const data = await response.json()
      setInquiries(data.data ?? [])
    } catch {
      setLoadError('無法載入詢價，請檢查連線後重試。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchInquiries() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchInquiries])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10 lg:py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[#FFFFFF]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[12px] bg-[#FFFFFF]" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-[12px] bg-[#FFFFFF]" />
      </div>
    )
  }

  const hasProfile = Boolean(artist?.display_name)
  const hasPricing = artist?.price_min != null
  const portfolioCount = artist?.portfolio_count ?? 0

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10 lg:py-8">
        {artist?.status && <ArtistStatusBanner status={artist.status} />}
        <div role="alert" className="mt-6 rounded-[12px] border border-[#DEDFD7] bg-[#FFFFFF] p-6 text-[#20241F]">
          <p className="font-medium">{loadError}</p>
          <button type="button" onClick={fetchInquiries} className="mt-4 h-11 rounded-lg bg-[#53614A] px-4 text-sm font-medium text-[#F7F6F2] hover:bg-[#3E4B36]">重新載入</button>
        </div>
      </div>
    )
  }

  // No inquiries → show onboarding checklist
  if (inquiries.length === 0) {
    return (
      <OnboardingChecklist
        hasProfile={hasProfile}
        portfolioCount={portfolioCount}
        hasPricing={hasPricing}
        artistSlug={artist?.slug ?? null}
        statusBanner={artist?.status && <ArtistStatusBanner status={artist.status} />}
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
    <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10 lg:py-8">
      {artist?.status && <ArtistStatusBanner status={artist.status} />}

      {/* Greeting */}
      <h1 className="font-display text-[30px] font-semibold text-[#20241F]">
        今天，從好好回覆開始。
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
        <StatCard label="已接受／已關閉" value={closed} />
      </div>

      {/* Recent inquiries */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-[#8A8A8A]">
            最新詢價
          </h2>
          <Link
            href="/artist/inquiries"
            className="font-sans text-[14px] text-[#53614A] transition-colors duration-200 hover:text-[#3E4B36]"
          >
            查看全部 →
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-[12px] border border-[#DEDFD7] bg-[#FFFFFF]">
          {recent.map((inquiry, index) => {
            const isPending = inquiry.status === 'pending'
            const label =
              inquiry.body_part ?? truncate(inquiry.description, 40)

            return (
              <Link
                key={inquiry.id}
                href={`/artist/inquiries` as Parameters<typeof Link>[0]['href']}
                className={`group flex items-start gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[#ECEEE7] ${
                  index < recent.length - 1 ? 'border-b border-[#DEDFD7]' : ''
                }`}
              >
                <div
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    isPending ? 'bg-[#53614A]' : 'bg-transparent'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-[#20241F]">
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
            className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#53614A] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
          >
            上傳作品
          </Link>
          <Link
            href="/artist/profile"
            className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#53614A] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
          >
            編輯檔案
          </Link>
          {artist?.slug && (
            <Link
              href={`/artists/${artist.slug}` as Parameters<typeof Link>[0]['href']}
              className="inline-flex items-center rounded-[4px] px-4 py-2 text-[14px] font-medium text-[#53614A] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
            >
              分享 Profile 連結
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
