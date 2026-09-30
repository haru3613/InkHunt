'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ProfileForm } from '@/components/artists/ProfileForm'
import { QuoteTemplateManager } from '@/components/artist/QuoteTemplateManager'
import type { Artist, Style } from '@/types/database'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'

export default function ProfilePage() {
  const { artist: authArtist, isLoading: authLoading } = useAuth()
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([])
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!authArtist) return
      try {
        const [stylesRes, artistRes, templatesRes] = await Promise.all([
          fetch('/api/styles'),
          fetch('/api/artists/me/profile'),
          fetch('/api/artists/me/templates'),
        ])

        if (!stylesRes.ok || !artistRes.ok) throw new Error('Could not load profile')
        setLoadError(false)
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
        setLoadError(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authArtist, retry])

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

  if (!authLoading && !authArtist) return <div className="v2-container py-16"><h1 className="text-2xl font-semibold">先建立你的刺青師資料</h1><Link href="/artist" className="v2-button mt-6">免費開始</Link></div>
  if (loadError) return <div className="v2-container py-16"><p role="alert">無法載入個人資料，請重試。你的原始資料並未變更。</p><button className="v2-button secondary mt-6" onClick={() => setRetry(value => value + 1)}>重新載入</button></div>
  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center h-screen text-[#20241F]/40">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10">
      <h1 className="text-2xl font-semibold text-[#20241F] mb-8">
        {artist ? '編輯個人檔案' : '申請成為刺青師'}
      </h1>
      <ProfileForm artist={artist} styles={styles} selectedStyleIds={selectedStyleIds} />

      <div className="border-t border-[#DEDFD7] mt-10 pt-10">
        <h2 className="text-lg font-semibold text-[#20241F] mb-6">快速報價模板</h2>
        <QuoteTemplateManager templates={templates} onSave={handleSaveTemplates} />
      </div>
    </div>
  )
}
