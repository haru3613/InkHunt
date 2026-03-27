'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PortfolioManageGrid } from '@/components/artists/PortfolioManageGrid'
import { PortfolioUploader } from '@/components/artists/PortfolioUploader'
import type { PortfolioItem } from '@/types/database'

export default function PortfolioPage() {
  const { artist } = useAuth()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!artist?.slug) return
      try {
        const res = await fetch(`/api/artists/${artist.slug}/portfolio`)
        if (res.ok) {
          const data = await res.json()
          setItems(data.data ?? data ?? [])
        }
      } catch {
        // Fetch failure is handled by leaving items empty
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [artist?.slug])

  const handleUpload = useCallback(async (urls: string[]) => {
    if (!artist) return
    for (const url of urls) {
      try {
        const res = await fetch(`/api/artists/${artist.slug}/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: url }),
        })
        if (res.ok) {
          const newItem = await res.json()
          setItems((prev) => [...prev, newItem])
        }
      } catch {
        // Individual item creation failure is non-fatal
      }
    }
  }, [artist])

  const handleDelete = useCallback(async (id: string) => {
    if (!artist) return
    try {
      await fetch(`/api/artists/${artist.slug}/portfolio/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      // Delete failure — item remains in the grid
    }
  }, [artist])

  const handleEdit = useCallback((_item: PortfolioItem) => {
    // TODO: Open edit dialog (Batch 2)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">作品集管理</h1>
        <PortfolioUploader onUpload={handleUpload} />
      </div>
      <p className="text-sm text-[#F5F0EB]/40">{items.length} 件作品</p>
      <PortfolioManageGrid items={items} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  )
}
