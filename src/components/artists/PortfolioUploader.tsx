'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/upload/client'

interface PortfolioUploaderProps {
  readonly onUpload: (urls: string[]) => void
  readonly disabled?: boolean
}

export function PortfolioUploader({ onUpload, disabled }: PortfolioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: Iterable<File>) => {
    setIsUploading(true)
    const selectedFiles = Array.from(files)
    const total = selectedFiles.length
    setFailedFiles([])

    const results = await Promise.allSettled(
      selectedFiles.map(async (file, i) => {
        const url = await uploadFile('portfolio', file)
        setProgress(((i + 1) / total) * 100)
        return url
      }),
    )

    const urls = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map((r) => r.value)
    const failures = results.flatMap((result, index) => result.status === 'rejected' ? [selectedFiles[index]] : [])

    setIsUploading(false)
    setProgress(0)
    if (urls.length > 0) {
      onUpload(urls)
    }
    setFailedFiles(failures)
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
        className="bg-[#53614A] text-[#F7F6F2] hover:bg-[#53614A]/90"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? `上傳中 ${Math.round(progress)}%` : '上傳作品'}
      </Button>
      {failedFiles.length > 0 && (
        <div role="alert" className="rounded-lg border border-[#B44747]/20 bg-[#B44747]/10 p-3 text-sm text-[#20241F]">
          <p>以下作品未上傳成功，已成功的作品會保留：</p>
          <ul className="mt-1 list-disc pl-5">{failedFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}</ul>
          <Button type="button" variant="outline" onClick={() => void handleFiles(failedFiles)} disabled={isUploading || disabled} className="mt-3 h-11 rounded-lg">重試失敗檔案</Button>
        </div>
      )}
    </div>
  )
}
