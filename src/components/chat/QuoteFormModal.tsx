'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SendQuoteRequest } from '@/types/chat'

export interface QuoteTemplate {
  readonly label: string
  readonly price: number
  readonly note?: string
}

interface QuoteFormModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly inquiryId: string
  readonly consumerName: string
  readonly inquiryDescription: string
  readonly templates: readonly QuoteTemplate[]
  readonly onSubmit: (data: SendQuoteRequest) => Promise<void>
}

export function QuoteFormModal({
  open,
  onOpenChange,
  consumerName,
  inquiryDescription,
  templates,
  onSubmit,
}: QuoteFormModalProps) {
  const t = useTranslations('quote')

  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = useCallback((template: QuoteTemplate) => {
    setPrice(String(template.price))
    setNote(template.note ?? '')
  }, [])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setPrice('')
    setNote('')
    setError(null)
    onOpenChange(false)
  }, [isSubmitting, onOpenChange])

  const handleSubmit = useCallback(async () => {
    const parsedPrice = parseInt(price, 10)

    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      setError(t('priceRequired'))
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({
        price: parsedPrice,
        note: note.trim() || undefined,
      })
      setPrice('')
      setNote('')
      onOpenChange(false)
    } catch {
      setError(t('submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }, [price, note, onSubmit, onOpenChange, t])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#141414] border border-[#2A2A2A] text-[#F5F0EB] max-w-md w-full p-0 gap-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#2A2A2A]">
          <DialogTitle className="text-base font-semibold text-[#F5F0EB] font-['Space_Grotesk',sans-serif]">
            {t('sendQuoteTo', { name: consumerName })}
          </DialogTitle>
          {inquiryDescription && (
            <p className="mt-1 text-xs text-[#F5F0EB]/50 line-clamp-2">
              {inquiryDescription}
            </p>
          )}
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Template buttons */}
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={`${tpl.price}-${tpl.label}`}
                  type="button"
                  onClick={() => handleTemplateSelect(tpl)}
                  className="rounded-md border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#F5F0EB]/70 hover:border-[#C8A97E]/60 hover:text-[#C8A97E] transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}

          {/* Price field */}
          <div className="space-y-1.5">
            <label
              htmlFor="quote-price"
              className="block text-xs font-medium text-[#F5F0EB]/60 uppercase tracking-wide"
            >
              {t('price')}
            </label>
            <div className="flex items-center rounded-md border border-[#2A2A2A] bg-[#0A0A0A] focus-within:border-[#C8A97E]/60">
              <span className="pl-3 text-sm text-[#F5F0EB]/40">NT$</span>
              <input
                id="quote-price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  setError(null)
                }}
                placeholder="0"
                className="w-full bg-transparent px-2 py-2.5 text-sm text-[#F5F0EB] placeholder:text-[#F5F0EB]/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Note field */}
          <div className="space-y-1.5">
            <label
              htmlFor="quote-note"
              className="block text-xs font-medium text-[#F5F0EB]/60 uppercase tracking-wide"
            >
              {t('note')}
            </label>
            <textarea
              id="quote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('notePlaceholder')}
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#F5F0EB] placeholder:text-[#F5F0EB]/20 outline-none resize-none focus:border-[#C8A97E]/60 transition-colors"
            />
            <p className="text-right text-xs text-[#F5F0EB]/30">
              {note.length}/500
            </p>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2A2A2A]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm text-[#F5F0EB]/60 hover:text-[#F5F0EB] transition-colors disabled:opacity-40"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-[#C8A97E] px-5 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#C8A97E]/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('submitting') : t('sendQuote')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
