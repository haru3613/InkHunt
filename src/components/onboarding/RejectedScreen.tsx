'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F6F2] px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f87171]/30 ${STATUS_COLORS.suspended.bg}`}>
          <span className={`text-2xl font-bold ${STATUS_COLORS.suspended.text}`}>!</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#20241F]">
            審核未通過
          </h1>
          <p className="text-sm leading-relaxed text-[#20241F]/60">
            你可以先更新作品集與個人資料，準備好後再重新送審。
          </p>
        </div>

        <div className="rounded-lg border border-[#DEDFD7] bg-[#FFFFFF] p-4 text-left">
          <p className="text-sm font-semibold text-[#20241F]">下一步</p>
          <p className="mt-1 text-sm leading-relaxed text-[#20241F]/60">
            更新完成後點擊重新送審，我們會再次審核你的刺青師資料。
          </p>
        </div>

        <div className="flex justify-center gap-5 text-sm text-primary"><Link href="/artist/profile" className="underline">編輯個人資料</Link><Link href="/artist/portfolio" className="underline">整理作品集</Link></div>
        <Button
          onClick={handleResubmit}
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-[#53614A] text-sm font-semibold text-[#F7F6F2] hover:bg-[#D8BD8E]"
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
