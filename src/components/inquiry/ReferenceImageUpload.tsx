'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { uploadFile } from '@/lib/upload/client'

const MAX_REFERENCE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ReferenceImageUploadProps {
  readonly images: readonly string[]
  readonly onImagesChange: (images: string[]) => void
  readonly maxSlots?: number
}

export function ReferenceImageUpload({
  images,
  onImagesChange,
  maxSlots = 3,
}: ReferenceImageUploadProps) {
  const t = useTranslations('inquiry')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emptySlotCount = maxSlots - images.length
  const canUploadMore = images.length < maxSlots

  const handleSlotClick = useCallback(() => {
    if (!canUploadMore) return
    setError(null)
    fileInputRef.current?.click()
  }, [canUploadMore])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Reset input so the same file can be re-selected after an error
      e.target.value = ''

      if (!file) return

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t('invalidImageType'))
        return
      }

      if (file.size > MAX_REFERENCE_SIZE) {
        setError(t('imageTooLarge'))
        return
      }

      const nextSlotIndex = images.length
      setUploadingSlot(nextSlotIndex)
      setError(null)

      try {
        const publicUrl = await uploadFile('inquiries', file)
        onImagesChange([...images, publicUrl])
      } catch {
        setError(t('uploadFailed'))
      } finally {
        setUploadingSlot(null)
      }
    },
    [images, onImagesChange, t],
  )

  const handleRemove = useCallback(
    (index: number) => {
      onImagesChange(images.filter((_, i) => i !== index))
    },
    [images, onImagesChange],
  )

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {/* Uploaded image thumbnails */}
        {images.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-lg border border-border"
          >
            <Image
              src={url}
              alt={`${t('referenceImage')} ${index + 1}`}
              fill
              sizes="120px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label={t('removeImage')}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* Loading slot */}
        {uploadingSlot !== null && (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-background">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty upload slots */}
        {uploadingSlot === null &&
          Array.from({ length: emptySlotCount }, (_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={handleSlotClick}
              aria-label={t('uploadImage')}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-6" />
              {i === 0 && images.length === 0 && (
                <span className="text-xs">{t('uploadImage')}</span>
              )}
            </button>
          ))}
      </div>

      {error && <p className="text-sm text-ink-error">{error}</p>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
  )
}
