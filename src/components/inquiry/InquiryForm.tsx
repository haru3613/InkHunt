'use client'

import { useState, useCallback } from 'react'
// HAR-667: use the LOCALE-AWARE router — bare `next/navigation` drops the
// current locale segment on push, bouncing English visitors to `/zh-TW`.
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerHeader,
  BottomDrawerTitle,
  BottomDrawerDescription,
} from '@/components/ui/bottom-drawer'
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
import { ReferenceImageUpload } from './ReferenceImageUpload'
import { inquirySchema, BODY_PARTS, BUDGET_RANGES } from '@/lib/validations/inquiry'
import { useAuth } from '@/hooks/useAuth'
import { trackSubmitInquiry } from '@/lib/analytics'
import type { ZodError } from 'zod'

interface InquiryFormProps {
  readonly artistId: string
  readonly artistName: string
  readonly artistSlug?: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

interface FormState {
  readonly description: string
  readonly body_part: string
  readonly size_estimate: string
  readonly budget_min: string
  readonly budget_max: string
  readonly budget_range: string
}

const INITIAL_FORM: FormState = {
  description: '',
  body_part: '',
  size_estimate: '',
  budget_min: '',
  budget_max: '',
  budget_range: '',
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
  artistSlug,
  open,
  onOpenChange,
}: InquiryFormProps) {
  const { isLoggedIn, loginWithRedirect } = useAuth()
  const router = useRouter()
  const t = useTranslations('inquiry')
  const tBudget = useTranslations('inquiry.budgetRange')

  // HAR-757: feeds both the Base UI Root's `items` (closed trigger renders
  // the label, not the raw code) and the <SelectItem> list.
  const budgetItems = BUDGET_RANGES.map((code) => ({
    value: code,
    label: tBudget(`options.${code}`),
  }))
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  // HAR-667: guards against duplicate inquiries from a double-tap/double-submit
  // — the button disables while a request is in flight and re-enables once it
  // settles (success or failure) so a retry after a failed submit still works.
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    // Double-submit guard (HAR-667): ignore a re-entrant submit (double-tap,
    // Enter + click) while the previous request is still in flight.
    if (isSubmitting) return

    const parsed = inquirySchema.safeParse({
      description: form.description,
      body_part: form.body_part,
      size_estimate: form.size_estimate,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      reference_images: referenceImages,
    })

    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error))
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist_id: artistId,
          ...parsed.data,
          budget_range: form.budget_range || undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Failed to create inquiry')
      }

      const { id } = await response.json()

      if (artistSlug) {
        const budgetRange =
          form.budget_min && form.budget_max
            ? `${form.budget_min}-${form.budget_max}`
            : undefined
        trackSubmitInquiry(artistSlug, form.body_part || undefined, budgetRange)
      }

      setForm(INITIAL_FORM)
      onOpenChange(false)
      router.push(`/inquiries/${id}`)
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    form,
    referenceImages,
    onOpenChange,
    isLoggedIn,
    isSubmitting,
    loginWithRedirect,
    artistId,
    artistSlug,
    router,
  ])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setForm(INITIAL_FORM)
        setErrors({})
        setReferenceImages([])
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  return (
    <BottomDrawer open={open} onOpenChange={handleOpenChange}>
      <BottomDrawerContent>
        <BottomDrawerHeader>
          <BottomDrawerTitle>{t('title', { artistName })}</BottomDrawerTitle>
          <BottomDrawerDescription>{t('subtitle')}</BottomDrawerDescription>
        </BottomDrawerHeader>

        <form
          className="overflow-y-auto space-y-4 px-4 pb-6"
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
            <ReferenceImageUpload
              images={referenceImages}
              onImagesChange={setReferenceImages}
            />
          </div>

          {/* Body part */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('bodyPart')} <span className="text-ink-error">{t('required')}</span>
            </label>
            <Select
              items={BODY_PARTS.map((part) => ({ value: part, label: part }))}
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

          {/* Budget range (optional categorical) — HAR-530 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {tBudget('label')}
            </label>
            <Select
              name="budget_range"
              items={budgetItems}
              value={form.budget_range}
              onValueChange={(val) => handleFieldChange('budget_range', val ?? '')}
            >
              <SelectTrigger className="w-full rounded-lg focus-visible:ring-primary">
                <SelectValue placeholder={tBudget('notSpecified')} />
              </SelectTrigger>
              <SelectContent>
                {budgetItems.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-text-muted">{tBudget('helper')}</p>
          </div>
          {/* Submit */}
          {errors._form && (
            <p className="text-sm text-red-500">{errors._form}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-ink-accent-hover"
            size="lg"
            disabled={isLoggedIn && isSubmitting}
          >
            {isLoggedIn ? t('submit') : t('loginToSubmit')}
          </Button>
        </form>
      </BottomDrawerContent>
    </BottomDrawer>
  )
}
