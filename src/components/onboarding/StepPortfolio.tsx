'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
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
}

export function StepPortfolio({
  data,
  onChange,
  onSubmit,
  onSkip,
  onBack,
  isSubmitting,
}: StepPortfolioProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const addFiles = useCallback(
    (incoming: File[]) => {
      const imageFiles = incoming.filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return

      const newUrls = imageFiles.map((f) => URL.createObjectURL(f))
      onChange({
        files: [...data.files, ...imageFiles],
        previewUrls: [...data.previewUrls, ...newUrls],
      })
    },
    [data, onChange],
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
    URL.revokeObjectURL(data.previewUrls[index])
    onChange({
      files: data.files.filter((_, i) => i !== index),
      previewUrls: data.previewUrls.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F5F0EB]">上傳作品集</h2>
        <p className="mt-1 text-sm text-[#F5F0EB]/50">
          有作品集的 Profile 曝光率高 3 倍
        </p>
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          isDragging
            ? 'border-[#C8A97E] bg-[#C8A97E]/5'
            : 'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A]'
        }`}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[#F5F0EB]/20"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-[#F5F0EB]/60">
            拖拉圖片至此，或{' '}
            <span className="text-[#C8A97E]">點擊選擇</span>
          </p>
          <p className="mt-1 text-xs text-[#F5F0EB]/30">JPG、PNG、WebP，最大 10 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isSubmitting}
          className="h-11 flex-1 rounded-lg border-[#2A2A2A] bg-transparent text-[#F5F0EB]/60 hover:bg-[#141414] hover:text-[#F5F0EB]"
        >
          上一步
        </Button>
        <Button
          onClick={onSkip}
          variant="outline"
          disabled={isSubmitting}
          className="h-11 flex-1 rounded-lg border-[#2A2A2A] bg-transparent text-[#F5F0EB]/60 hover:bg-[#141414] hover:text-[#F5F0EB]"
        >
          跳過
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="h-11 flex-[2] rounded-lg bg-[#C8A97E] text-[#0A0A0A] font-semibold hover:bg-[#C8A97E]/90 disabled:opacity-40"
        >
          {isSubmitting ? '送出中...' : '送出審核'}
        </Button>
      </div>
    </div>
  )
}
