'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PortfolioItem } from '@/types/database'

interface PortfolioManageGridProps {
  readonly items: readonly PortfolioItem[]
  readonly onDelete: (id: string) => void | Promise<void>
  readonly onEdit: (item: PortfolioItem) => void
}

export function PortfolioManageGrid({ items, onDelete, onEdit }: PortfolioManageGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }, [onDelete])

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-[#F5F0EB]/40">
        還沒有任何作品，點擊上方按鈕開始上傳
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative aspect-square overflow-hidden rounded-lg bg-[#141414]"
        >
          <Image
            src={item.image_url}
            alt={item.title ?? 'Portfolio item'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/50 group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => onEdit(item)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-400 hover:bg-red-400/20"
              onClick={() => void handleDelete(item.id)}
              disabled={deletingId === item.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {item.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="truncate text-xs text-white">{item.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
