'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AdminStatsBar } from '@/components/admin/AdminStatsBar'
import { ArtistTable } from '@/components/admin/ArtistTable'
import type { ArtistWithDetails, ArtistStatus } from '@/types/admin'
import { cn } from '@/lib/utils'

const TABS: Array<{ key: ArtistStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待審核' },
  { key: 'active', label: '已上線' },
  { key: 'suspended', label: '停權' },
]

export default function AdminPage() {
  const [artists, setArtists] = useState<ArtistWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ArtistStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchArtists = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/artists')
      if (!res.ok) throw new Error('Failed to fetch artists')
      const data = await res.json()
      setArtists(data.data ?? [])
    } catch {
      setError('載入失敗，請重試')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArtists()
  }, [fetchArtists])

  const handleStatusChange = useCallback(
    async (id: string, status: 'active' | 'suspended', note: string) => {
      const res = await fetch(`/api/admin/artists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_note: note || null }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await fetchArtists()
    },
    [fetchArtists],
  )

  const filtered = useMemo(() => {
    let result = artists
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.display_name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          (a.ig_handle?.toLowerCase().includes(q) ?? false),
      )
    }
    return result
  }, [artists, statusFilter, searchQuery])

  const tabCounts = useMemo(() => ({
    all: artists.length,
    pending: artists.filter((a) => a.status === 'pending').length,
    active: artists.filter((a) => a.status === 'active').length,
    suspended: artists.filter((a) => a.status === 'suspended').length,
  }), [artists])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header + Tabs */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-[#C8A97E]">InkHunt Admin</h1>
          <div className="flex gap-1 rounded-lg bg-[#141414] p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === tab.key
                    ? 'bg-[#C8A97E]/20 text-[#C8A97E]'
                    : 'text-[#F5F0EB]/40 hover:text-[#F5F0EB]/60',
                )}
              >
                {tab.label}
                <span className="ml-1 opacity-60">{tabCounts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <AdminStatsBar artists={artists} />
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋刺青師名稱或城市..."
            className="w-full rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-2.5 text-sm text-[#F5F0EB] placeholder:text-[#F5F0EB]/20 focus:border-[#C8A97E]/50 focus:outline-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#f87171]/20 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">
            {error}
            <button onClick={fetchArtists} className="ml-2 underline">重試</button>
          </div>
        )}

        {/* Table */}
        <ArtistTable artists={filtered} onStatusChange={handleStatusChange} />
      </div>
    </div>
  )
}
