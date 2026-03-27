'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploadPlaceholder } from './ImageUploadPlaceholder'
import { inquirySchema, BODY_PARTS } from '@/lib/validations/inquiry'
import { useAuth } from '@/hooks/useAuth'
import type { ZodError } from 'zod'

interface InquiryFormProps {
  readonly artistId: string
  readonly artistName: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

interface FormState {
  readonly description: string
  readonly body_part: string
  readonly size_estimate: string
  readonly budget_min: string
  readonly budget_max: string
}

const INITIAL_FORM: FormState = {
  description: '',
  body_part: '',
  size_estimate: '',
  budget_min: '',
  budget_max: '',
}

function flattenZodErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (!result[key]) {
      result[key] = issue.message
    }
  }
  return result
}

export function InquiryForm({
  artistId,
  artistName,
  open,
  onOpenChange,
}: InquiryFormProps) {
  const { isLoggedIn, loginWithRedirect } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => {
        if (!prev[field]) return prev
        const { [field]: _, ...rest } = prev
        return rest
      })
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      loginWithRedirect(window.location.pathname)
      return
    }

    const parsed = inquirySchema.safeParse({
      description: form.description,
      body_part: form.body_part,
      size_estimate: form.size_estimate,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      reference_images: [],
    })

    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error))
      return
    }

    setErrors({})

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist_id: artistId,
          ...parsed.data,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Failed to create inquiry')
      }

      const { id } = await response.json()
      setForm(INITIAL_FORM)
      onOpenChange(false)
      router.push(`/inquiries/${id}`)
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Something went wrong' })
    }
  }, [form, onOpenChange, isLoggedIn, loginWithRedirect, artistId, router])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setForm(INITIAL_FORM)
        setErrors({})
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:max-w-lg sm:mx-auto"
      >
        <SheetHeader>
          <SheetTitle>向 {artistName} 詢價</SheetTitle>
          <SheetDescription>
            填寫你的刺青需求，刺青師會盡快回覆報價
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-4 px-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="inquiry-description"
              className="text-sm font-medium text-stone-700"
            >
              圖案描述 <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="inquiry-description"
              placeholder="描述你想要的刺青圖案、風格、參考..."
              value={form.description}
              onChange={(e) =>
                handleFieldChange('description', e.target.value)
              }
              className="min-h-24 rounded-lg focus-visible:ring-amber-500"
              aria-invalid={!!errors.description}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-sm text-red-500">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-stone-400">
                {form.description.length}/1000
              </span>
            </div>
          </div>

          {/* Reference images */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              參考圖片（最多 3 張）
            </label>
            <ImageUploadPlaceholder />
          </div>

          {/* Body part */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              刺青部位 <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.body_part}
              onValueChange={(val) => handleFieldChange('body_part', val ?? '')}
            >
              <SelectTrigger
                className="w-full rounded-lg focus-visible:ring-amber-500"
                aria-invalid={!!errors.body_part}
              >
                <SelectValue placeholder="請選擇部位" />
              </SelectTrigger>
              <SelectContent>
                {BODY_PARTS.map((part) => (
                  <SelectItem key={part} value={part}>
                    {part}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.body_part && (
              <p className="text-sm text-red-500">{errors.body_part}</p>
            )}
          </div>

          {/* Size estimate */}
          <div className="space-y-1.5">
            <label
              htmlFor="inquiry-size"
              className="text-sm font-medium text-stone-700"
            >
              預計大小 <span className="text-red-500">*</span>
            </label>
            <Input
              id="inquiry-size"
              placeholder="例如：10x10 cm"
              value={form.size_estimate}
              onChange={(e) =>
                handleFieldChange('size_estimate', e.target.value)
              }
              className="rounded-lg focus-visible:ring-amber-500"
              aria-invalid={!!errors.size_estimate}
            />
            {errors.size_estimate && (
              <p className="text-sm text-red-500">{errors.size_estimate}</p>
            )}
          </div>

          {/* Budget range */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">
              預算範圍（NTD）
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="最低"
                value={form.budget_min}
                onChange={(e) =>
                  handleFieldChange('budget_min', e.target.value)
                }
                className="rounded-lg focus-visible:ring-amber-500"
                min={0}
              />
              <span className="text-stone-400">~</span>
              <Input
                type="number"
                placeholder="最高"
                value={form.budget_max}
                onChange={(e) =>
                  handleFieldChange('budget_max', e.target.value)
                }
                className="rounded-lg focus-visible:ring-amber-500"
                min={0}
              />
            </div>
            {(errors.budget_min || errors.budget_max) && (
              <p className="text-sm text-red-500">
                {errors.budget_min || errors.budget_max}
              </p>
            )}
          </div>
        </form>

        <SheetFooter className="flex-col gap-2">
          {errors._form && (
            <p className="text-sm text-red-500">{errors._form}</p>
          )}
          <Button
            onClick={handleSubmit}
            className="w-full bg-amber-500 text-white hover:bg-amber-600"
            size="lg"
          >
            {isLoggedIn ? '送出詢價' : 'LINE 登入後詢價'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
