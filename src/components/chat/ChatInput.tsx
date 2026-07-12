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
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setIsSending(true)
    setError(null)

    try {
      await Promise.resolve(onSendMessage('text', trimmed))
      setText('')
    } catch (err) {
      // Retain the text and show error to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
    } finally {
      setIsSending(false)
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

      setError(null)
      setIsSending(true)

      try {
        const publicUrl = await uploadFile('inquiries', file)
        await Promise.resolve(onSendMessage('image', publicUrl))
      } catch (err) {
        // Image upload failed; show error to user
        const errorMessage = err instanceof Error ? err.message : 'Failed to send image'
        setError(errorMessage)
      } finally {
        setIsSending(false)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onSendMessage],
  )

  return (
    <div className="border-t border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3">
      {error && (
        <div role="alert" className="mb-2 rounded bg-[#2A1414] px-3 py-2 text-[13px] text-[#E25C5C]">
          {error}
        </div>
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
          disabled={disabled || isSending}
        >
          <Image className="w-5 h-5" />
        </Button>
        {isArtist && onSendQuote && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSendQuote}
            className="text-[#C8A97E]/60 hover:text-[#C8A97E]"
            disabled={disabled || isSending}
          >
            <DollarSign className="w-5 h-5" />
          </Button>
        )}
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="輸入訊息..."
          className="flex-1 bg-[#141414] border-[#2A2A2A] text-[#F5F0EB] placeholder:text-[#F5F0EB]/30"
          disabled={disabled || isSending}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={disabled || isSending || !text.trim()}
          className="text-[#C8A97E] hover:text-[#C8A97E]/80"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
