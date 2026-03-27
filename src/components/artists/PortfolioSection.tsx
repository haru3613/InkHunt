"use client"

import { useState } from "react"
import { PortfolioGrid } from "@/components/artists/PortfolioGrid"
import { PortfolioLightbox } from "@/components/artists/PortfolioLightbox"
import type { PortfolioItem } from "@/types/database"

interface PortfolioSectionProps {
  readonly items: readonly PortfolioItem[]
}

export function PortfolioSection({ items }: PortfolioSectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <PortfolioGrid
        items={items}
        onItemClick={(index) => setLightboxIndex(index)}
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
