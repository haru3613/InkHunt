"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { PortfolioGrid } from "@/components/artists/PortfolioGrid"
import { PortfolioLightbox } from "@/components/artists/PortfolioLightbox"
import type { PortfolioItem } from "@/types/database"

interface PortfolioSectionProps {
  readonly items: readonly PortfolioItem[]
}

export function PortfolioSection({ items }: PortfolioSectionProps) {
  const t = useTranslations('portfolio')
  const tProfile = useTranslations('artistProfile')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <PortfolioGrid
        items={items}
        onItemClick={(index) => setLightboxIndex(index)}
        emptyLabel={tProfile('noPortfolio')}
        healedLabel={t('healedPhoto')}
        workLabel="Work"
      />
      {lightboxIndex !== null && (
        <PortfolioLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
