'use client'

import { useState, useCallback, useRef } from 'react'
import { OnboardingProgress } from './OnboardingProgress'
import { StepBasicInfo, type BasicInfoData } from './StepBasicInfo'
import { StepStylePicker, type StylePickerData } from './StepStylePicker'
import { StepPriceLocation, type PriceLocationData } from './StepPriceLocation'
import { StepPortfolio, type PortfolioData } from './StepPortfolio'
import { OnboardingComplete } from './OnboardingComplete'
import { uploadFile } from '@/lib/upload/client'

const TOTAL_STEPS = 4

interface OnboardingWizardProps {
  prefillName?: string
}

export function OnboardingWizard({ prefillName = '' }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadFailures, setUploadFailures] = useState<string[]>([])

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    display_name: prefillName,
    ig_handle: '',
    bio: '',
  })

  const [stylePicker, setStylePicker] = useState<StylePickerData>({
    selectedSlugs: [],
    canCover: false,
    acceptCustom: true,
    hasFlashDesigns: false,
  })

  const [priceLocation, setPriceLocation] = useState<PriceLocationData>({
    cities: [],
    district: '',
    price_min: '',
    price_max: '',
    pricing_note: '',
  })

  const [portfolio, setPortfolio] = useState<PortfolioData>({
    files: [],
    previewUrls: [],
  })

  const submittingRef = useRef(false)
  // The artist profile is created once. Failed portfolio uploads are retried
  // against this slug, so retrying never makes a second artist POST.
  const createdArtistSlugRef = useRef<string | null>(null)
  const uploadedFilesRef = useRef(new Set<File>())

  const handleSubmit = useCallback(
    async (skipPortfolio = false) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setIsSubmitting(true)
      setSubmitError(null)
      setUploadFailures([])

      try {
        // Build artist profile payload
        const payload = {
          display_name: basicInfo.display_name.trim(),
          ig_handle: basicInfo.ig_handle.trim() || null,
          bio: basicInfo.bio.trim() || null,
          city: priceLocation.cities.join(', '),
          district: priceLocation.district.trim() || null,
          price_min: priceLocation.price_min ? Number(priceLocation.price_min) : null,
          price_max: priceLocation.price_max ? Number(priceLocation.price_max) : null,
          pricing_note: priceLocation.pricing_note.trim() || null,
          style_slugs: stylePicker.selectedSlugs,
          can_cover: stylePicker.canCover,
          accept_custom: stylePicker.acceptCustom,
          has_flash_designs: stylePicker.hasFlashDesigns,
        }

        let artistSlug = createdArtistSlugRef.current
        if (!artistSlug) {
          const res = await fetch('/api/artists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error ?? '申請失敗，請稍後再試')
          }
          const artist = await res.json()
          artistSlug = artist.slug
          createdArtistSlugRef.current = artistSlug
        }

        // Every selected file must reach the portfolio endpoint before the
        // application completes. Keep successful files in the ref and retry
        // only failures, while the parent-owned selection stays untouched.
        if (!skipPortfolio && portfolio.files.length > 0) {
          const pendingFiles = portfolio.files.filter((file) => !uploadedFilesRef.current.has(file))
          const results = await Promise.allSettled(
            pendingFiles.map(async (file) => {
              const publicUrl = await uploadFile('portfolio', file)
              const response = await fetch(`/api/artists/${artistSlug}/portfolio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: publicUrl }),
              })
              if (!response.ok) throw new Error('作品資料儲存失敗')
              return file
            }),
          )
          const failedFiles: File[] = []
          for (const [index, result] of results.entries()) {
            if (result.status === 'fulfilled') uploadedFilesRef.current.add(result.value)
            else {
              const failedFile = pendingFiles[index]
              if (failedFile) failedFiles.push(failedFile)
            }
          }
          if (failedFiles.length > 0) {
            setUploadFailures(failedFiles.map((file) => file.name))
            throw new Error(`有 ${failedFiles.length} 張作品上傳失敗。請重試失敗的檔案；已成功上傳的作品不會重複送出。`)
          }
        }

        setIsComplete(true)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '申請失敗，請稍後再試')
      } finally {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    },
    [basicInfo, stylePicker, priceLocation, portfolio],
  )

  if (isComplete) {
    return <OnboardingComplete />
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && (
        <StepBasicInfo
          data={basicInfo}
          onChange={setBasicInfo}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepStylePicker
          data={stylePicker}
          onChange={setStylePicker}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepPriceLocation
          data={priceLocation}
          onChange={setPriceLocation}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <>
          {submitError && (
            <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <p>{submitError}</p>
              {uploadFailures.length > 0 && <ul className="mt-2 list-disc pl-5">{uploadFailures.map((name) => <li key={name}>{name}</li>)}</ul>}
            </div>
          )}
          <StepPortfolio
            data={portfolio}
            onChange={setPortfolio}
            onSubmit={() => handleSubmit(false)}
            onSkip={() => handleSubmit(true)}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </div>
  )
}
