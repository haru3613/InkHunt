'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { uploadFile } from '@/lib/upload/client'
import type { PortfolioItem, Style } from '@/types/database'

export interface PortfolioEditorPayload {
  title: string
  description: string | null
  style_id: number
  body_part: string | null
  size_cm: string | null
  healed_image_url: string | null
}

interface PortfolioEditorProps {
  readonly item?: PortfolioItem
  readonly imageUrl: string
  readonly styles: readonly Style[]
  readonly onSave: (payload: PortfolioEditorPayload) => Promise<void>
  readonly onCancel: () => void
}

export function PortfolioEditor({ item, imageUrl, styles, onSave, onCancel }: PortfolioEditorProps) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [styleId, setStyleId] = useState(item?.style_id?.toString() ?? '')
  const [bodyPart, setBodyPart] = useState(item?.body_part ?? '')
  const [sizeCm, setSizeCm] = useState(item?.size_cm ?? '')
  const [healedImageUrl, setHealedImageUrl] = useState(item?.healed_image_url ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingHealed, setIsUploadingHealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const healedInputRef = useRef<HTMLInputElement>(null)

  const handleHealedImage = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploadingHealed(true)
    setError(null)
    try {
      const url = await uploadFile('portfolio', file)
      setHealedImageUrl(url)
    } catch {
      setError('復原照上傳失敗，請重試')
    } finally {
      setIsUploadingHealed(false)
    }
  }, [])

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !styleId) {
      setError('請填寫作品名稱並選擇風格')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        style_id: Number(styleId),
        body_part: bodyPart.trim() || null,
        size_cm: sizeCm.trim() || null,
        healed_image_url: healedImageUrl || null,
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存失敗，請重試')
    } finally {
      setIsSaving(false)
    }
  }, [bodyPart, description, healedImageUrl, onSave, sizeCm, styleId, title])

  return (
    <section
      aria-labelledby="portfolio-editor-title"
      className="rounded-2xl border border-[#DEDFD7] bg-[#FFFFFF] p-5 shadow-sm lg:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="portfolio-editor-title" className="text-xl font-semibold text-[#20241F]">
            {item ? '編輯作品資料' : '完成作品資料'}
          </h2>
          <p className="mt-1 text-sm text-[#20241F]/60">清楚的題材與風格能讓使用者更容易在搜尋中找到你。</p>
        </div>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving || isUploadingHealed}>
          取消
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F7F6F2]">
          <Image src={imageUrl} alt="作品預覽" fill className="object-cover" sizes="220px" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-[#20241F]">作品名稱 *</span>
            <Input
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例：牡丹與錦鯉半甲"
              className="h-11 bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#20241F]">風格 *</span>
            <select
              required
              value={styleId}
              onChange={(event) => setStyleId(event.target.value)}
              className="v2-select w-full"
            >
              <option value="">選擇作品風格</option>
              {styles.map((style) => (
                <option key={style.id} value={style.id}>{style.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#20241F]">刺青部位</span>
            <Input
              maxLength={100}
              value={bodyPart}
              onChange={(event) => setBodyPart(event.target.value)}
              placeholder="例：右前臂"
              className="h-11 bg-white"
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-[#20241F]">作品描述與題材</span>
            <Textarea
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="描述題材、構圖或客人可以搜尋的關鍵字，例如：蛇、牡丹、東方傳統、黑灰。"
              className="min-h-28 bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#20241F]">尺寸</span>
            <Input
              maxLength={100}
              value={sizeCm}
              onChange={(event) => setSizeCm(event.target.value)}
              placeholder="例：12 × 8 cm"
              className="h-11 bg-white"
            />
          </label>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-[#20241F]">復原照（選填）</span>
            <input
              ref={healedInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleHealedImage}
            />
            <div className="flex min-h-11 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => healedInputRef.current?.click()}
                disabled={isUploadingHealed || isSaving}
              >
                {isUploadingHealed ? '上傳中…' : healedImageUrl ? '更換復原照' : '上傳復原照'}
              </Button>
              {healedImageUrl && (
                <button type="button" className="text-sm text-[#20241F]/60 underline" onClick={() => setHealedImageUrl('')}>
                  移除
                </button>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-[#B44747] sm:col-span-2">{error}</p>}

          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isUploadingHealed}>
              取消
            </Button>
            <Button type="submit" disabled={isSaving || isUploadingHealed || styles.length === 0} className="bg-[#53614A] text-[#F7F6F2] hover:bg-[#53614A]/90">
              {isSaving ? '儲存中…' : item ? '儲存變更' : '發布作品'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
