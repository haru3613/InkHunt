'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  const t = useTranslations('inquiry')
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
        className="rounded-t-2xl sm:max-w-lg sm:mx-auto"
      >
        <SheetHeader>
          <SheetTitle>{t('title', { artistName })}</SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>

        <form
          className="overflow-y-auto space-y-4 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="inquiry-description"
              className="text-sm font-medium text-foreground"
            >
              {t('description')} <span className="text-ink-error">{t('required')}</span>
            </label>
            <Textarea
              id="inquiry-description"
              placeholder={t('descriptionPlaceholder')}
              value={form.description}
              onChange={(e) =>
                handleFieldChange('description', e.target.value)
              }
              className="min-h-24 rounded-lg focus-visible:ring-primary"
              aria-invalid={!!errors.description}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-sm text-ink-error">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-ink-text-muted">
                {form.description.length}/1000
              </span>
            </div>
          </div>

          {/* Reference images */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('referenceImages')}
            </label>
            <ImageUploadPlaceholder />
          </div>

          {/* Body part */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('bodyPart')} <span className="text-ink-error">{t('required')}</span>
            </label>
            <Select
              value={form.body_part}
              onValueChange={(val) => handleFieldChange('body_part', val ?? '')}
            >
              <SelectTrigger
                className="w-full rounded-lg focus-visible:ring-primary"
                aria-invalid={!!errors.body_part}
              >
                <SelectValue placeholder={t('bodyPartPlaceholder')} />
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
              <p className="text-sm text-ink-error">{errors.body_part}</p>
            )}
          </div>

          {/* Size estimate */}
          <div className="space-y-1.5">
            <label
              htmlFor="inquiry-size"
              className="text-sm font-medium text-foreground"
            >
              {t('sizeEstimate')} <span className="text-ink-error">{t('required')}</span>
            </label>
            <Input
              id="inquiry-size"
              placeholder={t('sizePlaceholder')}
              value={form.size_estimate}
              onChange={(e) =>
                handleFieldChange('size_estimate', e.target.value)
              }
              className="rounded-lg focus-visible:ring-primary"
              aria-invalid={!!errors.size_estimate}
            />
            {errors.size_estimate && (
              <p className="text-sm text-ink-error">{errors.size_estimate}</p>
            )}
          </div>

          {/* Budget range */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('budget')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t('budgetMin')}
                value={form.budget_min}
                onChange={(e) =>
                  handleFieldChange('budget_min', e.target.value)
                }
                className="rounded-lg focus-visible:ring-primary"
                min={0}
              />
              <span className="text-ink-text-muted">~</span>
              <Input
                type="number"
                placeholder={t('budgetMax')}
                value={form.budget_max}
                onChange={(e) =>
                  handleFieldChange('budget_max', e.target.value)
                }
                className="rounded-lg focus-visible:ring-primary"
                min={0}
              />
            </div>
            {(errors.budget_min || errors.budget_max) && (
              <p className="text-sm text-ink-error">
                {errors.budget_min || errors.budget_max}
              </p>
            )}
          </div>
          {/* Submit */}
          {errors._form && (
            <p className="text-sm text-red-500">{errors._form}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-ink-accent-hover"
            size="lg"
          >
            {isLoggedIn ? t('submit') : 'LINE 登入後詢價'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
