import Image from "next/image"
import type { PortfolioItem } from "@/types/database"

interface PortfolioGridProps {
  readonly items: readonly PortfolioItem[]
  readonly onItemClick: (index: number) => void
  readonly emptyLabel: string
  readonly healedLabel: string
  readonly workLabel: string
}

export function PortfolioGrid({ items, onItemClick, emptyLabel, healedLabel, workLabel }: PortfolioGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-ink-text-muted">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(index)}
          className="group relative aspect-square overflow-hidden rounded-none bg-muted"
        >
          <Image
            src={item.thumbnail_url ?? item.image_url}
            alt={item.title ?? `${workLabel} ${index + 1}`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
            {...(index === 0 ? { priority: true } : { loading: "lazy" as const })}
          />

          {/* Hover overlay with info */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex items-center gap-1.5 text-xs text-white">
              {item.body_part && <span>{item.body_part}</span>}
              {item.body_part && item.size_cm && (
                <span className="text-white/50">|</span>
              )}
              {item.size_cm && <span>{item.size_cm} cm</span>}
            </div>
          </div>

          {/* Healed indicator */}
          {item.healed_image_url && (
            <span className="absolute top-1.5 right-1.5 rounded bg-card/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
              {healedLabel}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
