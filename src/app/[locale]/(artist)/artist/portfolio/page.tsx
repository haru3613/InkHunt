'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { PortfolioManageGrid } from '@/components/artists/PortfolioManageGrid'
import { PortfolioUploader } from '@/components/artists/PortfolioUploader'
import type { PortfolioItem } from '@/types/database'

export default function PortfolioPage() {
  const { artist, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`/api/artists/${artist.slug}/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('刪除失敗，請重試')
        return
      }
      setError(null)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      // Network failure — item remains in the grid
      setError('刪除失敗，請重試')
    }
  }, [artist])

  const handleEdit = useCallback((_item: PortfolioItem) => {
    // TODO: Open edit dialog (Batch 2)
  }, [])

  // HAR-684: non-artists never fetch, so their isLoading never resolves —
  // gate the spinner on having an artist at all
  if (authLoading || (isLoading && artist)) {
    return (
      <div className="flex h-screen items-center justify-center text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  // HAR-684: non-artist gate — offer the artist entry flow instead of an
  // infinite spinner
  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-[#F5F0EB]/60">你還不是刺青師，先完成申請即可管理作品集</p>
        <Link
          href="/artist"
          className="rounded-md bg-[#C8A97E] px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#C8A97E]/80"
        >
          前往刺青師入口
        </Link>
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
      {error && <div className="text-sm text-red-400">{error}</div>}
      <PortfolioManageGrid items={items} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  )
}
