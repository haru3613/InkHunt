'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { QuoteCompareCard } from '@/components/quotes/QuoteCompareCard'
import type { QuoteRequestWithQuotes, InquiryWithDetails } from '@/lib/supabase/queries/quote-requests'

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-5 space-y-4 animate-pulse"
        >
          {/* Avatar + name skeleton */}
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
          {/* Price skeleton */}
          <div className="h-8 w-32 rounded bg-muted" />
          {/* Note skeleton */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          {/* Buttons skeleton */}
          <div className="flex gap-2">
            <div className="h-7 flex-1 rounded-lg bg-muted" />
            <div className="h-7 flex-1 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function QuoteRequestPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('compare')

  const [data, setData] = useState<QuoteRequestWithQuotes | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote-requests/${id}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json as QuoteRequestWithQuotes)
    } catch {
      // Silently handle fetch failure; data remains null
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAcceptQuote = useCallback(
    async (inquiryId: string, quoteId: string) => {
      try {
        await fetch(`/api/inquiries/${inquiryId}/quotes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote_id: quoteId, status: 'accepted' }),
        })
        // Refetch to get updated statuses
        setIsLoading(true)
        await fetchData()
      } catch {
        // Silently handle fetch failure
      }
    },
    [fetchData],
  )

  const total = data?.inquiries.length ?? 0
  const quotedCount = data?.inquiries.filter(
    (inq: InquiryWithDetails) => inq.quotes.length > 0,
  ).length ?? 0

  const progressPercent = total > 0 ? (quotedCount / total) * 100 : 0

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t('yourInquiry')}
        </h1>
        {!isLoading && data && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('quotesReceived', { count: quotedCount, total })}
          </p>
        )}

        {/* Progress bar */}
        {!isLoading && total > 0 && (
          <div className="mt-3 h-1 rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : data && data.inquiries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.inquiries.map((inq: InquiryWithDetails) => {
            // Use the most recent sent quote, or first quote if none sent
            const sentQuote = inq.quotes.find((q) => q.status === 'sent') ?? inq.quotes[0] ?? null

            return (
              <QuoteCompareCard
                key={inq.id}
                artistName={inq.artist?.display_name ?? '刺青師'}
                artistAvatar={inq.artist?.avatar_url ?? null}
                artistCity={inq.artist?.city ?? null}
                artistSlug={inq.artist?.slug ?? ''}
                quote={
                  sentQuote
                    ? {
                        id: sentQuote.id,
                        price: sentQuote.price,
                        note: sentQuote.note,
                        status: sentQuote.status,
                        available_dates: sentQuote.available_dates,
                      }
                    : null
                }
                inquiryId={inq.id}
                onAccept={() =>
                  sentQuote && handleAcceptQuote(inq.id, sentQuote.id)
                }
              />
            )
          })}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">{t('waiting')}</p>
      )}
    </main>
  )
}
