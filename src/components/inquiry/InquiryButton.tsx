'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { InquiryForm } from './InquiryForm'

interface InquiryButtonProps {
  readonly artistId: string
  readonly artistName: string
  readonly className?: string
}

export function InquiryButton({ artistId, artistName, className }: InquiryButtonProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('artistProfile')

  const handleOpen = useCallback(() => setOpen(true), [])

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
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
