'use client'

import { useState, useCallback, useRef } from 'react'
import { Send, Image, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadFile } from '@/lib/upload/client'

interface ChatInputProps {
  readonly onSendMessage: (type: 'text' | 'image', content: string) => void
  readonly onSendQuote?: () => void
  readonly isArtist: boolean
  readonly disabled?: boolean
}

export function ChatInput({ onSendMessage, onSendQuote, isArtist, disabled }: ChatInputProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSendMessage('text', trimmed)
    setText('')
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
        onSendMessage('image', publicUrl)
      } catch {
        // Image upload failed; user can retry
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onSendMessage],
  )

  return (
    <div className="flex items-center gap-2 p-3 border-t border-[#1F1F1F] bg-[#0A0A0A]">
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
        className="flex-1 bg-[#141414] border-[#1F1F1F] text-[#F5F0EB] placeholder:text-[#F5F0EB]/30"
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
  )
}
