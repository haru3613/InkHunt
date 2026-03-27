import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuoteCardProps {
  readonly quoteId: string
  readonly price: number
  readonly note: string | null
  readonly availableDates: string[] | null
  readonly status: string
  readonly isOwn: boolean
  readonly onAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

const STATUS_LABELS: Record<string, string> = {
  sent: '等待回應',
  viewed: '已讀',
  accepted: '已接受',
  rejected: '已拒絕',
}

export function QuoteCard({
  quoteId,
  price,
  note,
  availableDates,
  status,
  isOwn,
  onAction,
}: QuoteCardProps) {
  const showActions = !isOwn && status === 'sent'

  return (
    <div className="max-w-[80%] bg-[#1F1F1F] border border-[#C8A97E]/30 rounded-xl p-4 space-y-3">
      <div className="text-xs text-[#C8A97E] font-medium uppercase tracking-wider">
        報價
      </div>
      <div className="text-2xl font-bold text-[#F5F0EB]">
        NT${price.toLocaleString()}
      </div>
      {note && <p className="text-sm text-[#F5F0EB]/70">{note}</p>}
      {availableDates && availableDates.length > 0 && (
        <div className="text-xs text-[#F5F0EB]/50">
          可預約：{availableDates.join(', ')}
        </div>
      )}
      {showActions ? (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onAction?.(quoteId, 'accepted')}
            className="flex-1 bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90"
            size="sm"
          >
            接受
          </Button>
          <Button
            onClick={() => onAction?.(quoteId, 'rejected')}
            variant="outline"
            className="flex-1 border-[#F5F0EB]/20 text-[#F5F0EB]"
            size="sm"
          >
            拒絕
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'text-xs font-medium',
            status === 'accepted'
              ? 'text-green-500'
              : status === 'rejected'
                ? 'text-red-400'
                : 'text-[#F5F0EB]/40',
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </div>
      )}
    </div>
  )
}
