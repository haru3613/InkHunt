'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileForm } from '@/components/artists/ProfileForm'
import { QuoteTemplateManager } from '@/components/artist/QuoteTemplateManager'
import type { Artist, Style } from '@/types/database'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'

export default function ProfilePage() {
  const { artist: authArtist } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([])
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [stylesRes, artistRes, templatesRes] = await Promise.all([
          fetch('/api/styles'),
          authArtist?.slug ? fetch(`/api/artists/${authArtist.slug}`) : null,
          fetch('/api/artists/me/templates'),
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

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTemplates(templatesData.templates ?? [])
        }
      } catch {
        // Profile data load failed; show empty state
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authArtist?.slug])

  const handleSaveTemplates = useCallback(async (updated: QuoteTemplate[]) => {
    const res = await fetch('/api/artists/me/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: updated }),
    })
    if (!res.ok) throw new Error('Failed to save templates')
    const data = await res.json()
    setTemplates(data.templates ?? updated)
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10">
      <h1 className="text-2xl font-semibold text-[#F5F0EB] mb-8">
        {artist ? '編輯個人檔案' : '申請成為刺青師'}
      </h1>
      <ProfileForm artist={artist} styles={styles} selectedStyleIds={selectedStyleIds} />

      <div className="border-t border-[#1F1F1F] mt-10 pt-10">
        <h2 className="text-lg font-semibold text-[#F5F0EB] mb-6">快速報價模板</h2>
        <QuoteTemplateManager templates={templates} onSave={handleSaveTemplates} />
      </div>
    </div>
  )
}
