"use client"

import { InquiryButton } from "@/components/inquiry/InquiryButton"

interface MobileCTAProps {
  readonly artistId: string
  readonly artistName: string
}

export function MobileCTA({ artistId, artistName }: MobileCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4 lg:hidden">
      <InquiryButton
        artistId={artistId}
        artistName={artistName}
        className="flex h-12 w-full items-center justify-center rounded-sm bg-primary text-base font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover"
      />
    </div>
  )
}
