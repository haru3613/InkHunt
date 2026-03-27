'use client'

import { useState, useCallback } from 'react'
import { OnboardingProgress } from './OnboardingProgress'
import { StepBasicInfo, type BasicInfoData } from './StepBasicInfo'
import { StepStylePicker, type StylePickerData } from './StepStylePicker'
import { StepPriceLocation, type PriceLocationData } from './StepPriceLocation'
import { StepPortfolio, type PortfolioData } from './StepPortfolio'
import { OnboardingComplete } from './OnboardingComplete'

const TOTAL_STEPS = 4

interface OnboardingWizardProps {
  prefillName?: string
}

export function OnboardingWizard({ prefillName = '' }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const handleSubmit = useCallback(
    async (skipPortfolio = false) => {
      setIsSubmitting(true)
      setSubmitError(null)

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

        // Upload portfolio images if any and not skipping
        if (!skipPortfolio && portfolio.files.length > 0) {
          for (const file of portfolio.files) {
            try {
              // Get signed upload URL
              const signedRes = await fetch('/api/upload/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, contentType: file.type }),
              })

              if (!signedRes.ok) continue

              const { signedUrl, publicUrl } = await signedRes.json()

              await fetch(signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
              })

              await fetch(`/api/artists/${artist.slug}/portfolio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: publicUrl }),
              })
            } catch {
              // Non-fatal: portfolio upload failure doesn't block onboarding
            }
          }
        }

        setIsComplete(true)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '申請失敗，請稍後再試')
      } finally {
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
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {submitError}
            </p>
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
