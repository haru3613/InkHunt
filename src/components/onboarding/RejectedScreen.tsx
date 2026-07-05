'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { STATUS_COLORS } from '@/types/admin'

export function RejectedScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResubmit() {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/artists/me/resubmit', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to resubmit')
      window.location.reload()
    } catch {
      setError('送審失敗，請稍後再試。')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f87171]/30 ${STATUS_COLORS.suspended.bg}`}>
          <span className={`text-2xl font-bold ${STATUS_COLORS.suspended.text}`}>!</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0EB]">
            審核未通過
          </h1>
          <p className="text-sm leading-relaxed text-[#F5F0EB]/60">
            你可以先更新作品集與個人資料，準備好後再重新送審。
          </p>
        </div>

        <div className="rounded-lg border border-[#1F1F1F] bg-[#141414] p-4 text-left">
          <p className="text-sm font-semibold text-[#F5F0EB]">下一步</p>
          <p className="mt-1 text-sm leading-relaxed text-[#F5F0EB]/60">
            更新完成後點擊重新送審，我們會再次審核你的刺青師資料。
          </p>
        </div>

        <Button
          onClick={handleResubmit}
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-[#C8A97E] text-sm font-semibold text-[#0A0A0A] hover:bg-[#D8BD8E]"
        >
          {isSubmitting ? '送審中...' : '重新送審'}
        </Button>

        {error ? (
          <p className="text-sm text-[#f87171]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
