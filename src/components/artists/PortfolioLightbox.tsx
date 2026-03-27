"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import type { PortfolioItem } from "@/types/database"

interface PortfolioLightboxProps {
  readonly items: readonly PortfolioItem[]
  readonly initialIndex: number
  readonly onClose: () => void
}

export function PortfolioLightbox({
  items,
  initialIndex,
  onClose,
}: PortfolioLightboxProps) {
  const t = useTranslations('portfolio')
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showHealed, setShowHealed] = useState(false)

  const currentItem = items[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < items.length - 1

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
    setShowHealed(false)
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))
    setShowHealed(false)
  }, [items.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && hasPrev) goToPrev()
      if (e.key === "ArrowRight" && hasNext) goToNext()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, goToPrev, goToNext, hasPrev, hasNext])

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  if (!currentItem) return null

  const hasHealedImage = Boolean(currentItem.healed_image_url)
  const displayUrl = showHealed && currentItem.healed_image_url
    ? currentItem.healed_image_url
    : currentItem.image_url

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={t('imageViewer')}
    >
      {/* Overlay click to close */}
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label={t('close')}
      />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
        aria-label={t('close')}
      >
        <XIcon className="size-6" />
      </Button>

      {/* Prev button */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={goToPrev}
          className="absolute left-2 z-10 text-white hover:bg-white/10 md:left-4"
          aria-label={t('prev')}
        >
          <ChevronLeftIcon className="size-8" />
        </Button>
      )}

      {/* Next button */}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={goToNext}
          className="absolute right-2 z-10 text-white hover:bg-white/10 md:right-4"
          aria-label={t('next')}
        >
          <ChevronRightIcon className="size-8" />
        </Button>
      )}

      {/* Image + Info */}
      <div className="relative z-10 flex max-h-[85vh] max-w-[90vw] flex-col items-center md:max-w-3xl">
        <div className="relative aspect-square w-full max-w-[80vh]">
          <Image
            src={displayUrl}
            alt={currentItem.title ?? `${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 90vw, 768px"
            priority
          />
        </div>

        {/* Info bar */}
        <div className="mt-3 flex w-full flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-white/80">
            {currentItem.title && (
              <span className="font-medium text-white">{currentItem.title}</span>
            )}
            {currentItem.body_part && <span>{currentItem.body_part}</span>}
            {currentItem.body_part && currentItem.size_cm && (
              <span className="text-white/40">|</span>
            )}
            {currentItem.size_cm && <span>{currentItem.size_cm} cm</span>}
          </div>

          {/* Healed toggle */}
          {hasHealedImage && (
            <button
              type="button"
              onClick={() => setShowHealed((prev) => !prev)}
              className="rounded-full border border-white/30 px-3 py-1 text-xs text-white transition-colors hover:bg-white/10"
            >
              {showHealed ? t('viewOriginal') : t('viewHealed')}
            </button>
          )}

          {/* Counter */}
          <span className="text-xs text-white/50">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      </div>
    </div>
  )
}
