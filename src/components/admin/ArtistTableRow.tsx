import type { ArtistWithDetails, ArtistStatus } from '@/types/admin'
import { STATUS_LABELS, STATUS_COLORS } from '@/types/admin'
import { formatPriceRange, cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface ArtistTableRowProps {
  readonly artist: ArtistWithDetails
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

export function ArtistTableRow({ artist, isExpanded, onToggle }: ArtistTableRowProps) {
  const status = artist.status as ArtistStatus
  const statusColor = STATUS_COLORS[status]
  const priceText = formatPriceRange(artist.price_min, artist.price_max) ?? '—'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-3 border-b border-[#1F1F1F] px-4 py-3 text-left transition-colors hover:bg-[#141414]',
        isExpanded && 'border-l-2 border-l-[#C8A97E] bg-[#C8A97E]/5',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-xs text-[#F5F0EB]/60">
          {artist.display_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[#F5F0EB]">{artist.display_name}</div>
          {artist.ig_handle && (
            <div className="truncate text-xs text-[#F5F0EB]/30">@{artist.ig_handle}</div>
          )}
        </div>
      </div>
      <div className="hidden w-20 text-xs text-[#F5F0EB]/60 sm:block">{artist.city}</div>
      <div className="hidden flex-1 gap-1 lg:flex">
        {artist.styles.slice(0, 3).map((s) => (
          <span key={s.id} className="rounded bg-[#1F1F1F] px-1.5 py-0.5 text-[10px] text-[#F5F0EB]/60">
            {s.name}
          </span>
        ))}
        {artist.styles.length > 3 && (
          <span className="text-[10px] text-[#F5F0EB]/30">+{artist.styles.length - 3}</span>
        )}
      </div>
      <div className="hidden w-24 text-xs text-[#F5F0EB]/60 md:block">{priceText}</div>
      <div className="w-16 shrink-0">
        <span className={cn('rounded-full px-2 py-0.5 text-[10px]', statusColor.bg, statusColor.text)}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <ChevronDown className={cn('size-4 shrink-0 text-[#F5F0EB]/30 transition-transform', isExpanded && 'rotate-180')} />
    </button>
  )
}
