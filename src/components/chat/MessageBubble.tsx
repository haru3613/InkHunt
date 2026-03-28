import { cn } from '@/lib/utils'
import type { Message } from '@/types/database'
import type { QuoteMetadata } from '@/types/chat'
import { QuoteCard } from './QuoteCard'

interface MessageBubbleProps {
  readonly message: Message
  readonly isOwn: boolean
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({ message, isOwn, onQuoteAction }: MessageBubbleProps) {
  if (message.message_type === 'system') {
    const lines = (message.content ?? '').split('\n').filter(Boolean)
    const title = lines[0] ?? ''
    const details = lines.slice(1)

    return (
      <div className="flex justify-center py-3">
        <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#141414] px-5 py-4">
          <div className="mb-2 text-sm font-display font-medium text-[#C8A97E]">{title}</div>
          {details.length > 0 && (
            <div className="space-y-1">
              {details.map((line, i) => (
                <p key={i} className="text-sm text-[#F5F0EB]/60">{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (message.message_type === 'quote') {
    const metadata = message.metadata as unknown as QuoteMetadata
    return (
      <div className={cn('flex py-1', isOwn ? 'justify-end' : 'justify-start')}>
        <QuoteCard
          quoteId={metadata.quote_id}
          price={metadata.price}
          note={metadata.note}
          availableDates={metadata.available_dates}
          status={metadata.status}
          isOwn={isOwn}
          onAction={onQuoteAction}
        />
      </div>
    )
  }

  return (
    <div className={cn('flex py-1', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOwn ? 'bg-[#C8A97E] text-[#0A0A0A]' : 'bg-[#1F1F1F] text-[#F5F0EB]',
        )}
      >
        {message.message_type === 'image' ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.content ?? ''}
            alt="Shared image"
            className="rounded-lg max-w-full max-h-64 object-cover"
            loading="lazy"
          />
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <time
          className={cn(
            'text-xs mt-1.5 block',
            isOwn ? 'text-[#0A0A0A]/50' : 'text-[#F5F0EB]/30',
          )}
        >
          {formatTime(message.created_at)}
        </time>
      </div>
    </div>
  )
}
