'use client'

import { useState, useCallback } from 'react'
import type { ArtistWithDetails } from '@/types/admin'
import { ArtistTableRow } from './ArtistTableRow'
import { ArtistExpandedRow } from './ArtistExpandedRow'

interface ArtistTableProps {
  readonly artists: readonly ArtistWithDetails[]
  readonly onStatusChange: (id: string, status: 'active' | 'suspended', note: string) => Promise<void>
}

export function ArtistTable({ artists, onStatusChange }: ArtistTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  if (artists.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[#F5F0EB]/30">
        沒有符合條件的刺青師
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#1F1F1F]">
      <div className="hidden items-center gap-3 border-b border-[#1F1F1F] bg-[#141414] px-4 py-2 text-[10px] text-[#F5F0EB]/30 sm:flex">
        <div className="flex-1">刺青師</div>
        <div className="w-20">城市</div>
        <div className="hidden flex-1 lg:block">風格</div>
        <div className="hidden w-24 md:block">價格</div>
        <div className="w-16">狀態</div>
        <div className="w-4" />
      </div>
      {artists.map((artist) => (
        <div key={artist.id}>
          <ArtistTableRow artist={artist} isExpanded={expandedId === artist.id} onToggle={() => handleToggle(artist.id)} />
          {expandedId === artist.id && (
            <ArtistExpandedRow artist={artist} onAction={(status, note) => onStatusChange(artist.id, status, note)} />
          )}
        </div>
      ))}
    </div>
  )
}
