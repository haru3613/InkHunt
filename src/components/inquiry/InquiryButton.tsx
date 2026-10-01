'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { trackClickInquiry } from '@/lib/analytics'
import { InquiryForm } from './InquiryForm'

interface InquiryButtonProps {
  readonly artistId: string
  readonly artistName: string
  readonly artistSlug?: string
  readonly className?: string
}

export function InquiryButton({ artistId, artistName, artistSlug, className }: InquiryButtonProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => {
    if (new URLSearchParams(window.location.search).get("inquiry") === "1" && triggerRef.current?.getClientRects().length) {
      // Restore only the visible desktop or mobile trigger.
      setOpen(true)
    }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  const t = useTranslations('artistProfile')

  const handleOpen = useCallback(() => {
    if (artistSlug) {
      trackClickInquiry(artistSlug, artistName)
    }
    setOpen(true)
  }, [artistSlug, artistName])

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className={className ?? 'inline-flex h-11 items-center justify-center rounded-sm bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover'}
      >
        {t('inquire')}
      </button>
      <InquiryForm
        artistId={artistId}
        artistName={artistName}
        artistSlug={artistSlug}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
