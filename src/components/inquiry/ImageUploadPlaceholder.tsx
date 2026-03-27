'use client'

import { ImageIcon } from 'lucide-react'

interface ImageUploadPlaceholderProps {
  readonly maxSlots?: number
}

export function ImageUploadPlaceholder({ maxSlots = 3 }: ImageUploadPlaceholderProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: maxSlots }, (_, i) => (
        <div
          key={i}
          className="relative flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted"
        >
          <div className="flex flex-col items-center gap-1 text-ink-text-muted">
            <ImageIcon className="size-6" />
            {i === 0 && (
              <span className="text-xs">上傳圖片</span>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
            <span className="rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              即將開放
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
