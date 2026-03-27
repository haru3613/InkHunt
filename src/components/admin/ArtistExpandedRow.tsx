'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { ArtistWithDetails, ArtistStatus } from '@/types/admin'
import { STATUS_LABELS, STATUS_COLORS } from '@/types/admin'
import { formatPriceRange, cn } from '@/lib/utils'
import type { PortfolioItem } from '@/types/database'

interface ArtistExpandedRowProps {
  readonly artist: ArtistWithDetails
  readonly onAction: (status: 'active' | 'suspended', note: string) => Promise<void>
}

export function ArtistExpandedRow({ artist, onAction }: ArtistExpandedRowProps) {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [note, setNote] = useState(artist.admin_note ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const res = await fetch(`/api/artists/${artist.slug}/portfolio`)
        if (res.ok) {
          const data = await res.json()
          setPortfolio(Array.isArray(data) ? data : [])
        }
      } catch {
        // Portfolio fetch failed — show empty grid
      }
    }
    fetchPortfolio()
  }, [artist.slug])

  const handleAction = async (status: 'active' | 'suspended') => {
    setIsSubmitting(true)
    try {
      await onAction(status, note)
    } finally {
      setIsSubmitting(false)
    }
  }

  const status = artist.status as ArtistStatus
  const priceText = formatPriceRange(artist.price_min, artist.price_max)

  return (
    <div className="border-b border-[#1F1F1F] border-l-2 border-l-[#C8A97E] bg-[#141414] px-6 py-4">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-lg text-[#F5F0EB]/60">
          {artist.display_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#F5F0EB]">{artist.display_name}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', STATUS_COLORS[status].bg, STATUS_COLORS[status].text)}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          {artist.ig_handle && (
            <a href={`https://instagram.com/${artist.ig_handle}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#C8A97E] hover:underline">
              @{artist.ig_handle}
            </a>
          )}
          <div className="mt-1 text-xs text-[#F5F0EB]/40">
            {artist.city}{artist.district ? ` ${artist.district}` : ''}
            {priceText ? ` · ${priceText}` : ''}
            {' · '}申請於 {new Date(artist.created_at).toLocaleDateString('zh-TW')}
          </div>
        </div>
      </div>

      {artist.styles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {artist.styles.map((s) => (
            <span key={s.id} className="rounded bg-[#1F1F1F] px-2 py-0.5 text-xs text-[#F5F0EB]/70">{s.name}</span>
          ))}
        </div>
      )}

      {artist.bio && (
        <p className="mb-3 text-sm leading-relaxed text-[#F5F0EB]/60">{artist.bio}</p>
      )}

      {portfolio.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs text-[#F5F0EB]/40">作品集 ({portfolio.length} 張)</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {portfolio.map((item) => (
              <div key={item.id} className="relative aspect-square overflow-hidden rounded bg-[#1F1F1F]">
                <Image src={item.image_url} alt={item.title ?? 'Portfolio'} fill className="object-cover" sizes="80px" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor={`note-${artist.id}`} className="mb-1 block text-xs text-[#F5F0EB]/40">管理備註 (選填)</label>
          <textarea
            id={`note-${artist.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="輸入備註..."
            rows={2}
            className="w-full resize-none rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F0EB] placeholder:text-[#F5F0EB]/20 focus:border-[#C8A97E]/50 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          {status === 'pending' && (
            <>
              <button onClick={() => handleAction('active')} disabled={isSubmitting} className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#4ade80]/80 disabled:opacity-50">核准上線</button>
              <button onClick={() => handleAction('suspended')} disabled={isSubmitting} className="rounded-lg bg-[#f87171] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f87171]/80 disabled:opacity-50">拒絕</button>
            </>
          )}
          {status === 'active' && (
            <button onClick={() => handleAction('suspended')} disabled={isSubmitting} className="rounded-lg bg-[#f87171] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f87171]/80 disabled:opacity-50">停權</button>
          )}
          {status === 'suspended' && (
            <button onClick={() => handleAction('active')} disabled={isSubmitting} className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#4ade80]/80 disabled:opacity-50">重新上線</button>
          )}
        </div>
      </div>
    </div>
  )
}
