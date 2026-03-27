'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileForm } from '@/components/artists/ProfileForm'
import type { Artist, Style } from '@/types/database'

export default function ProfilePage() {
  const { artist: authArtist } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [stylesRes, artistRes] = await Promise.all([
          fetch('/api/styles'),
          authArtist?.slug ? fetch(`/api/artists/${authArtist.slug}`) : null,
        ])

        if (stylesRes.ok) {
          const stylesData = await stylesRes.json()
          setStyles(stylesData.data ?? stylesData ?? [])
        }

        if (artistRes?.ok) {
          const artistData = await artistRes.json()
          setArtist(artistData)
          setSelectedStyleIds(artistData.styles?.map((s: Style) => s.id) ?? [])
        }
      } catch {
        // Profile data load failed; show empty state
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authArtist?.slug])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">Loading...</div>
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold text-[#F5F0EB] mb-8">
        {artist ? '編輯個人檔案' : '申請成為刺青師'}
      </h1>
      <ProfileForm artist={artist} styles={styles} selectedStyleIds={selectedStyleIds} />
    </div>
  )
}
