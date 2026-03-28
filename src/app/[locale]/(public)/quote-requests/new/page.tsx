'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { ReferenceImageUpload } from '@/components/inquiry/ReferenceImageUpload'
import { BODY_PARTS } from '@/lib/validations/inquiry'
import { useAuth } from '@/hooks/useAuth'

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

export default function NewQuoteRequestPage() {
  const tCompare = useTranslations('compare')
  const tInquiry = useTranslations('inquiry')
  const { isLoggedIn, isLoading, loginWithRedirect } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const artistIdsParam = searchParams.get('artists') ?? ''
  const artistIds = artistIdsParam
    ? artistIdsParam.split(',').filter(Boolean)
    : []
  const artistCount = artistIds.length

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFieldChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isLoggedIn) {
        loginWithRedirect(window.location.pathname + window.location.search)
        return
      }

      setSubmitting(true)
      setError(null)

      try {
        const response = await fetch('/api/quote-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artist_ids: artistIds,
            description: form.description,
            reference_images: referenceImages,
            body_part: form.body_part,
            size_estimate: form.size_estimate,
            budget_min: form.budget_min ? Number(form.budget_min) : undefined,
            budget_max: form.budget_max ? Number(form.budget_max) : undefined,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error ?? 'Failed to submit')
        }

        const { id } = await response.json()
        router.push(`/quote-requests/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setSubmitting(false)
      }
    },
    [
      form,
      referenceImages,
      artistIds,
      isLoggedIn,
      loginWithRedirect,
      router,
    ],
  )

  if (artistCount === 0) {
    return (
      <main className="mx-auto max-w-[480px] px-4 py-8">
        <p className="text-center text-muted-foreground">
          {tCompare('noArtistsSelected')}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[480px] px-4 py-8">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {tCompare('sendInquiryTo', { count: artistCount })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tCompare('formDescription')}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="qr-description"
            className="text-sm font-medium text-foreground"
          >
            {tInquiry('description')}{' '}
            <span className="text-ink-error">{tInquiry('required')}</span>
          </label>
          <Textarea
            id="qr-description"
            placeholder={tInquiry('descriptionPlaceholder')}
            value={form.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="min-h-24 rounded-lg focus-visible:ring-primary"
            required
            minLength={10}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {form.description.length}/1000
            </span>
          </div>
        </div>

        {/* Reference images */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {tInquiry('referenceImages')}
          </label>
          <ReferenceImageUpload
            images={referenceImages}
            onImagesChange={setReferenceImages}
          />
        </div>

        {/* Body part */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {tInquiry('bodyPart')}{' '}
            <span className="text-ink-error">{tInquiry('required')}</span>
          </label>
          <Select
            value={form.body_part}
            onValueChange={(val) => handleFieldChange('body_part', val ?? '')}
          >
            <SelectTrigger className="w-full rounded-lg focus-visible:ring-primary">
              <SelectValue placeholder={tInquiry('bodyPartPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {BODY_PARTS.map((part) => (
                <SelectItem key={part} value={part}>
                  {part}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size estimate */}
        <div className="space-y-1.5">
          <label
            htmlFor="qr-size"
            className="text-sm font-medium text-foreground"
          >
            {tInquiry('sizeEstimate')}{' '}
            <span className="text-ink-error">{tInquiry('required')}</span>
          </label>
          <Input
            id="qr-size"
            placeholder={tInquiry('sizePlaceholder')}
            value={form.size_estimate}
            onChange={(e) =>
              handleFieldChange('size_estimate', e.target.value)
            }
            className="rounded-lg focus-visible:ring-primary"
            required
          />
        </div>

        {/* Budget range */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {tInquiry('budget')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={tInquiry('budgetMin')}
              value={form.budget_min}
              onChange={(e) => handleFieldChange('budget_min', e.target.value)}
              className="rounded-lg focus-visible:ring-primary"
              min={0}
            />
            <Input
              type="number"
              placeholder={tInquiry('budgetMax')}
              value={form.budget_max}
              onChange={(e) => handleFieldChange('budget_max', e.target.value)}
              className="rounded-lg focus-visible:ring-primary"
              min={0}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-ink-error">{error}</p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-ink-accent-hover"
          size="lg"
          disabled={submitting || isLoading}
        >
          {isLoggedIn
            ? tCompare('sendToArtists', { count: artistCount })
            : 'LINE 登入後詢價'}
        </Button>
      </form>
    </main>
  )
}
