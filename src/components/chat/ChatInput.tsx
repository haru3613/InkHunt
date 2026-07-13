'use client'

import { useState, useCallback, useRef } from 'react'
import { Send, Image, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadFile } from '@/lib/upload/client'

interface ChatInputProps {
  readonly onSendMessage: (type: 'text' | 'image', content: string) => Promise<void> | void
  readonly onSendQuote?: () => void
  readonly isArtist: boolean
  readonly disabled?: boolean
}

export function ChatInput({ onSendMessage, onSendQuote, isArtist, disabled }: ChatInputProps) {
  const [text, setText] = useState('')
  // HAR-653: failed sends must be visible, not silent
  const [sendFailed, setSendFailed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      await onSendMessage('text', trimmed)
      // Only clear the input after successful send
      setText('')
      setSendFailed(false)
    } catch {
      // Input remains for user to retry
      setSendFailed(true)
    }
  }, [text, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const publicUrl = await uploadFile('inquiries', file)
        await onSendMessage('image', publicUrl)
        setSendFailed(false)
      } catch {
        // Upload or message send failed; user can retry
        setSendFailed(true)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onSendMessage],
  )

  return (
    <div className="border-t border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3">
    {sendFailed && (
      <p role="alert" className="mx-auto max-w-2xl pb-2 text-[12px] text-[#E25C5C]">
        訊息傳送失敗，請重試
      </p>
    )}
    <div className="mx-auto flex max-w-2xl items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageSelect}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="text-[#F5F0EB]/40 hover:text-[#F5F0EB]"
        disabled={disabled}
      >
        <Image className="w-5 h-5" />
      </Button>
      {isArtist && onSendQuote && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSendQuote}
          className="text-[#C8A97E]/60 hover:text-[#C8A97E]"
          disabled={disabled}
        >
          <DollarSign className="w-5 h-5" />
        </Button>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="輸入訊息..."
        className="flex-1 bg-[#141414] border-[#2A2A2A] text-[#F5F0EB] placeholder:text-[#F5F0EB]/30"
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="text-[#C8A97E] hover:text-[#C8A97E]/80"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
    </div>
  )
}
