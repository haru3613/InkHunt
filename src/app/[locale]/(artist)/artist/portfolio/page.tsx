'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { PortfolioManageGrid } from '@/components/artists/PortfolioManageGrid'
import { PortfolioUploader } from '@/components/artists/PortfolioUploader'
import { PortfolioEditor, type PortfolioEditorPayload } from '@/components/artists/PortfolioEditor'
import { Button } from '@/components/ui/button'
import type { PortfolioItem, Style } from '@/types/database'

type EditorState =
  | { kind: 'new'; url: string }
  | { kind: 'edit'; item: PortfolioItem }
  | null

export default function PortfolioPage() {
  const { artist, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [pendingUrls, setPendingUrls] = useState<string[]>([])
  const [editor, setEditor] = useState<EditorState>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadKey, setLoadKey] = useState(0)

  useEffect(() => {
    async function load() {
      if (!artist?.slug) return
      try {
        setIsLoading(true)
        setError(null)
        const [portfolioRes, stylesRes] = await Promise.all([
          fetch('/api/artists/me/portfolio', { cache: 'no-store' }),
          fetch('/api/styles'),
        ])
        if (!portfolioRes.ok) throw new Error('無法載入作品集，請重試')
        if (!stylesRes.ok) throw new Error('無法載入刺青風格，請重試')

        const [portfolioData, stylesData] = await Promise.all([
          portfolioRes.json(),
          stylesRes.json(),
        ])
        setItems(portfolioData.data ?? portfolioData ?? [])
        setStyles(stylesData.data ?? stylesData ?? [])
      } catch {
        setError('無法載入作品集，請重試')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [artist?.slug, loadKey])

  const handleUpload = useCallback(async (urls: string[]) => {
    const uniqueUrls = urls.filter((url) =>
      !items.some((item) => item.image_url === url) && !pendingUrls.includes(url),
    )
    if (uniqueUrls.length === 0) return

    setPendingUrls((prev) => [...prev, ...uniqueUrls])
    setEditor((current) => current ?? { kind: 'new', url: uniqueUrls[0] })
    setError(null)
  }, [items, pendingUrls])

  const handleSave = useCallback(async (payload: PortfolioEditorPayload) => {
    if (!artist || !editor) return

    if (editor.kind === 'edit') {
      const res = await fetch(`/api/artists/${artist.slug}/portfolio/${editor.item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('作品資料儲存失敗，請重試')
      const updated = await res.json() as PortfolioItem
      setItems((prev) => prev.map((item) => item.id === updated.id ? updated : item))
      setEditor(null)
      setError(null)
      return
    }

    const res = await fetch(`/api/artists/${artist.slug}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: editor.url, ...payload }),
    })
    if (!res.ok) {
      throw new Error('圖片已上傳，但作品資料尚未發布。請直接重試，不需要重新上傳圖片。')
    }

    const newItem = await res.json() as PortfolioItem
    setItems((prev) => prev.some((item) => item.id === newItem.id) ? prev : [...prev, newItem])
    const remaining = pendingUrls.filter((url) => url !== editor.url)
    setPendingUrls(remaining)
    setEditor(remaining[0] ? { kind: 'new', url: remaining[0] } : null)
    setError(null)
  }, [artist, editor, pendingUrls])

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
      setEditor((current) => current?.kind === 'edit' && current.item.id === id ? null : current)
    } catch {
      // Network failure — item remains in the grid
      setError('刪除失敗，請重試')
    }
  }, [artist])

  const handleEdit = useCallback((item: PortfolioItem) => {
    setEditor({ kind: 'edit', item })
    setError(null)
  }, [])

  // HAR-684: non-artists never fetch, so their isLoading never resolves —
  // gate the spinner on having an artist at all
  if (authLoading || (isLoading && artist)) {
    return (
      <div className="flex h-screen items-center justify-center text-[#20241F]/40">
        Loading...
      </div>
    )
  }

  // HAR-684: non-artist gate — offer the artist entry flow instead of an
  // infinite spinner
  if (!artist) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-[#20241F]/60">你還不是刺青師，先完成申請即可管理作品集</p>
        <Link
          href="/artist"
          className="rounded-md bg-[#53614A] px-4 py-2 text-sm font-medium text-[#F7F6F2] transition-colors hover:bg-[#53614A]/80"
        >
          前往刺青師入口
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#20241F]">作品集管理</h1>
        <PortfolioUploader onUpload={handleUpload} />
      </div>
      <p className="text-sm text-[#20241F]/40">{items.length} 件作品</p>
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#B44747]/20 bg-[#B44747]/10 p-4 text-sm text-[#B44747]">
          <span>{error}</span>
          {items.length === 0 && (
            <Button type="button" variant="outline" onClick={() => setLoadKey((key) => key + 1)}>重新載入</Button>
          )}
        </div>
      )}

      {pendingUrls.length > 0 && (
        <div className="rounded-xl border border-[#53614A]/25 bg-[#53614A]/8 p-4 text-sm text-[#20241F]">
          <p className="font-medium">{pendingUrls.length} 張圖片已上傳，請完成作品資料後發布。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingUrls.map((url, index) => (
              <Button key={url} type="button" variant="outline" onClick={() => setEditor({ kind: 'new', url })}>
                編輯待發布作品 {index + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

      {editor && (
        <PortfolioEditor
          key={editor.kind === 'new' ? editor.url : editor.item.id}
          item={editor.kind === 'edit' ? editor.item : undefined}
          imageUrl={editor.kind === 'new' ? editor.url : editor.item.image_url}
          styles={styles}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
        />
      )}
      <PortfolioManageGrid items={items} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  )
}
