import Image from "next/image"
import type { PortfolioItem } from "@/types/database"

interface PortfolioGridProps {
  readonly items: readonly PortfolioItem[]
  readonly onItemClick: (index: number) => void
}

export function PortfolioGrid({ items, onItemClick }: PortfolioGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-stone-400">
        尚無作品
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
          className="group relative aspect-square overflow-hidden rounded-lg bg-stone-100"
        >
          <Image
            src={item.thumbnail_url ?? item.image_url}
            alt={item.title ?? `作品 ${index + 1}`}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
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
            <span className="absolute top-1.5 right-1.5 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 backdrop-blur-sm">
              恢復照
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
