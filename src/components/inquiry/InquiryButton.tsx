'use client'

import { useState, useCallback } from 'react'
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
