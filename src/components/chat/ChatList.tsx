'use client'

import { cn } from '@/lib/utils'
import type { Inquiry } from '@/types/database'

interface ChatListItem {
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
  })
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

        return (
          <button
            key={item.inquiry.id}
            onClick={() => onSelect(item.inquiry.id)}
            className={cn(
              'flex items-center gap-3 p-4 text-left transition-colors border-b border-[#1F1F1F]',
              isSelected ? 'bg-[#1F1F1F]' : 'hover:bg-[#141414]',
            )}
          >
            <div className="w-11 h-11 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#F5F0EB]/60 text-sm font-medium shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#F5F0EB] truncate">
                  {displayName}
                </span>
                {item.last_message_at && (
                  <span className="text-xs text-[#F5F0EB]/30 shrink-0">
                    {formatDate(item.last_message_at)}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#F5F0EB]/40 truncate mt-1">
                {item.last_message ?? item.inquiry.description}
              </p>
            </div>
            {item.unread_count > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#C8A97E] text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
