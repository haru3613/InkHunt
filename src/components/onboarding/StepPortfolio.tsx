'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PortfolioData {
  files: File[]
  previewUrls: string[]
}

interface StepPortfolioProps {
  data: PortfolioData
  onChange: (data: PortfolioData) => void
  onSubmit: () => void
  onSkip: () => void
  onBack: () => void
  isSubmitting: boolean
  profileCreated?: boolean
  managePreviews?: boolean
}

export function StepPortfolio({
  data,
  onChange,
  onSubmit,
  onSkip,
  onBack,
  isSubmitting,
  profileCreated = false,
  managePreviews = false,
}: StepPortfolioProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (isSubmitting || profileCreated) return
      const imageFiles = incoming.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 10 * 1024 * 1024)
      if (imageFiles.length !== incoming.length) setFileError('請選擇 JPG、PNG 或 WebP，每張不超過 10 MB。')
      else setFileError(null)
      if (imageFiles.length === 0) return
      if (data.files.length + imageFiles.length > 20 || [...data.files, ...imageFiles].reduce((sum, f) => sum + f.size, 0) > 100 * 1024 * 1024) {
        setFileError('最多選擇 20 張作品，合計不超過 100 MB。')
        return
      }
      const newUrls = managePreviews ? [] : imageFiles.map(f => URL.createObjectURL(f))
      onChange({
        files: [...data.files, ...imageFiles],
        previewUrls: [...data.previewUrls, ...newUrls],
      })
    },
    [data, onChange, isSubmitting, profileCreated, managePreviews],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function removeFile(index: number) {
    if (isSubmitting || profileCreated) return
    if (!managePreviews) URL.revokeObjectURL(data.previewUrls[index])
    onChange({
      files: data.files.filter((_, i) => i !== index),
      previewUrls: data.previewUrls.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#20241F]">上傳作品集</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          讓客人看到你的風格，請上傳你創作或已取得授權的作品。
        </p>
      </div>

      <p className="text-sm text-muted-foreground">可以先送出基本資料，稍後再補作品。未通過審核前，檔案不會公開接案。</p>
      {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
      {/* Drop zone */}
      <button
        type="button"
        disabled={isSubmitting || profileCreated}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          isDragging
            ? 'border-[#53614A] bg-[#53614A]/5'
            : 'border-[#DEDFD7] bg-[#FFFFFF] hover:border-[#3A3A3A]'
        }`}
      >
        <Upload aria-hidden="true" className="size-9 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            拖拉圖片至此，或{' '}
            <span className="text-[#53614A]">點擊選擇</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JPG、PNG、WebP，最大 10 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="選擇作品圖片"
          disabled={isSubmitting || profileCreated}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </button>

      {/* Preview grid */}
      {data.previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {data.previewUrls.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={url}
                alt={`作品 ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, 20vw"
              />
              <button
                type="button"
                aria-label={`移除作品 ${i + 1}`}
                disabled={isSubmitting || profileCreated}
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isSubmitting || profileCreated}
          className="h-11 flex-1 rounded-lg border-[#DEDFD7] bg-transparent text-muted-foreground hover:bg-[#FFFFFF] hover:text-[#20241F]"
        >
          上一步
        </Button>
        {data.files.length > 0 && <Button
          onClick={onSkip}
          variant="outline"
          disabled={isSubmitting}
          className="min-h-11 h-auto w-full whitespace-normal rounded-lg border-border px-3 py-2 text-muted-foreground sm:order-last"
        >
          先送出資料，稍後補作品
        </Button>}
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="h-11 flex-[2] rounded-lg bg-[#53614A] text-[#F7F6F2] font-semibold hover:bg-[#53614A]/90 disabled:opacity-40"
        >
          {isSubmitting ? '送出中...' : profileCreated ? '重試完成申請' : data.files.length === 0 ? '送出申請，稍後補作品' : '送出審核'}
        </Button>
      </div>
      {data.files.length > 0 && <p className="text-xs text-muted-foreground">選擇「稍後補作品」不會上傳目前尚未完成的圖片。</p>}
    </div>
  )
}
