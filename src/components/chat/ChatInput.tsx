'use client'

import { useState, useCallback, useRef } from 'react'
import { Send, Image as ImageIcon, DollarSign } from 'lucide-react'
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
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendingRef = useRef(false)
  const isComposingRef = useRef(false)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || disabled || sendingRef.current) return
    sendingRef.current = true
    setIsSending(true)
    try {
      await onSendMessage('text', trimmed)
      // Only clear the input after successful send
      setText((current) => current === trimmed ? '' : current)
      setSendFailed(false)
    } catch {
      // Input remains for user to retry
      setSendFailed(true)
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }, [disabled, text, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isComposingRef.current) {
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
    <div className="border-t border-[#DEDFD7] bg-[#F7F6F2] px-4 py-3">
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
        aria-label="上傳參考圖片"
        onClick={() => fileInputRef.current?.click()}
        className="text-[#20241F]/40 hover:text-[#20241F]"
        disabled={disabled || isSending}
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      {isArtist && onSendQuote && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="傳送報價"
          onClick={onSendQuote}
          className="text-[#53614A]/60 hover:text-[#53614A]"
          disabled={disabled || isSending}
        >
          <DollarSign className="w-5 h-5" />
        </Button>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { isComposingRef.current = true }}
        onCompositionEnd={() => { isComposingRef.current = false }}
        placeholder="輸入訊息..."
        className="flex-1 bg-[#FFFFFF] border-[#DEDFD7] text-[#20241F] placeholder:text-[#20241F]/30"
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="傳送訊息"
        onClick={handleSend}
        disabled={disabled || isSending || !text.trim()}
        className="text-[#53614A] hover:text-[#53614A]/80"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
    </div>
  )
}
