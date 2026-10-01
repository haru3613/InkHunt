import type { ArtistWithDetails } from '@/types/admin'
import { STATUS_LABELS, STATUS_COLORS } from '@/types/admin'
import { formatPriceRange, cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface ArtistTableRowProps {
  readonly artist: ArtistWithDetails
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

export function ArtistTableRow({ artist, isExpanded, onToggle }: ArtistTableRowProps) {
  const status = artist.status
  const statusColor = STATUS_COLORS[status]
  const priceText = formatPriceRange(artist.price_min, artist.price_max) ?? '—'

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-3 border-b border-[#DEDFD7] px-4 py-3 text-left transition-colors hover:bg-[#FFFFFF]',
        isExpanded && 'border-l-2 border-l-[#53614A] bg-[#53614A]/5',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DEDFD7] text-xs text-[#20241F]/60">
          {artist.display_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[#20241F]">{artist.display_name}</div>
          {artist.ig_handle && (
            <div className="truncate text-xs text-[#20241F]/30">@{artist.ig_handle}</div>
          )}
        </div>
      </div>
      <div className="hidden w-20 text-xs text-[#20241F]/60 sm:block">{artist.city}</div>
      <div className="hidden flex-1 gap-1 lg:flex">
        {artist.styles.slice(0, 3).map((s) => (
          <span key={s.id} className="rounded bg-[#DEDFD7] px-1.5 py-0.5 text-[10px] text-[#20241F]/60">
            {s.name}
          </span>
        ))}
        {artist.styles.length > 3 && (
          <span className="text-[10px] text-[#20241F]/30">+{artist.styles.length - 3}</span>
        )}
      </div>
      <div className="hidden w-24 text-xs text-[#20241F]/60 md:block">{priceText}</div>
      <div className="w-16 shrink-0">
        <span className={cn('rounded-full px-2 py-0.5 text-[10px]', statusColor.bg, statusColor.text)}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <ChevronDown className={cn('size-4 shrink-0 text-[#20241F]/30 transition-transform', isExpanded && 'rotate-180')} />
    </button>
  )
}
