'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PortfolioUploaderProps {
  readonly onUpload: (urls: string[]) => void
  readonly disabled?: boolean
}

export function PortfolioUploader({ onUpload, disabled }: PortfolioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList) => {
    setIsUploading(true)
    const urls: string[] = []
    const total = files.length

    for (let i = 0; i < total; i++) {
      const file = files[i]
      try {
        const signedRes = await fetch('/api/upload/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'portfolio',
            filename: file.name,
            content_type: file.type,
          }),
        })
        if (!signedRes.ok) {
          throw new Error('Failed to get upload URL')
        }
        const { signed_url, public_url } = await signedRes.json()

        await fetch(signed_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        urls.push(public_url)
        setProgress(((i + 1) / total) * 100)
      } catch (err) {
        // Upload failure for individual file is non-fatal; continue with remaining files
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        void errorMessage
      }
    }

    setIsUploading(false)
    setProgress(0)
    if (urls.length > 0) {
      onUpload(urls)
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onUpload])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files)
    }
  }, [handleFiles])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <Button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? `上傳中 ${Math.round(progress)}%` : '上傳作品'}
      </Button>
    </div>
  )
}
