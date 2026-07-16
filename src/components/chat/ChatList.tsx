'use client'

import { useTranslations } from 'next-intl'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import type { Inquiry } from '@/types/database'

export interface ChatListItem {
  inquiry: Inquiry
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface ChatListProps {
  readonly items: ChatListItem[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
  readonly viewAs: 'artist' | 'consumer'
}

// Status badge color config following DESIGN.md palette. Single source of truth
// for the per-status color; the label is resolved from i18n (inquiry.status.*).
const STATUS_CLASSNAME: Record<Inquiry['status'], string> = {
  pending: 'bg-[#C8A97E] text-[#0A0A0A]',
  quoted: 'border border-[#8A8A8A] text-[#8A8A8A]',
  accepted: 'bg-[#4ADE80]/15 text-[#4ADE80]',
  closed: 'text-[#555555]',
}

function StatusBadge({ status }: { readonly status: Inquiry['status'] }) {
  const t = useTranslations('inquiry.status')
  const className = STATUS_CLASSNAME[status]
  if (!className) return null

  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight',
        className,
      )}
    >
      {t(status)}
    </span>
  )
}

// HAR-712: at-a-glance budget pill. Label reuses the shared
// `inquiry.budgetRange.options.*` keys (same source as the inquiry form). Falsy
// budget_range renders nothing — no broken/empty badge.
function BudgetBadge({ budgetRange }: { readonly budgetRange: Inquiry['budget_range'] }) {
  const t = useTranslations('inquiry.budgetRange.options')
  if (!budgetRange) return null

  return (
    <span
      data-testid="budget-badge"
      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium leading-tight border border-[#C8A97E]/40 text-[#C8A97E]"
    >
      {t(budgetRange)}
    </span>
  )
}

export function ChatList({ items, selectedId, onSelect, viewAs }: ChatListProps) {
  return (
    <div className="flex flex-col overflow-y-auto">
      {items.length === 0 && (
        <div className="p-8 text-center text-[#F5F0EB]/40 text-sm">
          還沒有任何對話
        </div>
      )}
      {items.map((item) => {
        const displayName =
          viewAs === 'artist'
            ? (item.consumer_name ?? '消費者')
            : item.artist_display_name
        const isSelected = selectedId === item.inquiry.id
        const hasUnread = item.unread_count > 0
        const isClosed = item.inquiry.status === 'closed'
        const timestamp = item.last_message_at ?? item.inquiry.created_at

        return (
          <button
            key={item.inquiry.id}
            onClick={() => onSelect(item.inquiry.id)}
            className={cn(
              'flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[#2A2A2A]',
              isSelected ? 'bg-[#1C1C1C]' : 'hover:bg-[#141414]',
              isClosed && 'opacity-50',
            )}
          >
            {/* Avatar with unread dot indicator */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-[#1C1C1C] flex items-center justify-center text-[#F5F0EB]/60 text-sm font-medium">
                {getInitials(displayName)}
              </div>
              {hasUnread && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C8A97E] border-2 border-[#0A0A0A]"
                  aria-label="未讀訊息"
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Top row: name + timestamp */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span
                  className={cn(
                    'text-[14px] font-medium truncate',
                    hasUnread ? 'text-[#F5F0EB]' : 'text-[#F5F0EB]/80',
                  )}
                >
                  {displayName}
                </span>
                <span className="text-[11px] text-[#555555] shrink-0">
                  {formatRelativeTime(timestamp)}
                </span>
              </div>

              {/* Middle row: last message preview */}
              <p className="text-[13px] text-[#F5F0EB]/40 truncate mb-1.5">
                {item.last_message ?? item.inquiry.description}
              </p>

              {/* Bottom row: status + budget badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={item.inquiry.status} />
                <BudgetBadge budgetRange={item.inquiry.budget_range} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
