'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { OnboardingProgress } from './OnboardingProgress'
import { StepBasicInfo, type BasicInfoData } from './StepBasicInfo'
import { StepStylePicker, onboardingStyleLabel, type StylePickerData } from './StepStylePicker'
import { StepPriceLocation, type PriceLocationData } from './StepPriceLocation'
import { StepPortfolio, type PortfolioData } from './StepPortfolio'
import { OnboardingComplete } from './OnboardingComplete'
import { uploadFile } from '@/lib/upload/client'
import { onboardingFileKey } from '@/lib/onboarding-draft'
import { useOnboardingDraft } from './useOnboardingDraft'

const TOTAL_STEPS = 4

interface OnboardingWizardProps {
  prefillName?: string
  accountId?: string
  initialArtistSlug?: string
  onProfileCreated?: (slug: string) => Promise<void>
  recoverExistingProfile?: () => Promise<string | null>
}

export function OnboardingWizard({ prefillName = '', accountId, initialArtistSlug, onProfileCreated, recoverExistingProfile }: OnboardingWizardProps) {
  const { draft, setDraft, loaded, locked, recovered, alreadySubmitted, saveStatus, save, finish } = useOnboardingDraft(accountId, prefillName, initialArtistSlug)
  const { step, basicInfo, stylePicker, priceLocation } = draft
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadFailures, setUploadFailures] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const portfolio = { files: draft.files, previewUrls }
  const setStep = (value: number) => setDraft(current => ({ ...current, step: value }))
  const setBasicInfo = (value: BasicInfoData) => setDraft(current => ({ ...current, basicInfo: value }))
  const setStylePicker = (value: StylePickerData) => setDraft(current => ({ ...current, stylePicker: value }))
  const setPriceLocation = (value: PriceLocationData) => setDraft(current => ({ ...current, priceLocation: value }))
  const setPortfolio = (value: PortfolioData) => setDraft(current => ({ ...current, files: value.files }))
  const contentRef = useRef<HTMLDivElement>(null)
  const lastStep = useRef(step)

  useEffect(() => {
    const urls = draft.files.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
    return () => { urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [draft.files])

  useEffect(() => {
    if (lastStep.current !== step) {
      const heading = contentRef.current?.querySelector<HTMLHeadingElement>('h2')
      if (heading) { heading.tabIndex = -1; heading.focus() }
      contentRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
      lastStep.current = step
    }
  }, [step])

  const submittingRef = useRef(false)
  const submissionController = useRef<AbortController | null>(null)
  useEffect(() => () => { submissionController.current?.abort() }, [])
  // The artist profile is created once. Failed portfolio uploads are retried
  // against this slug, so retrying never makes a second artist POST.
  const createdArtistSlugRef = useRef<string | null>(null)
  const uploadedFilesRef = useRef(new Set<string>())

  const handleSubmit = useCallback(
    async (skipPortfolio = false) => {
      if (submittingRef.current || !loaded) return
      submittingRef.current = true
      const controller = new AbortController()
      submissionController.current = controller
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

        let artistSlug = createdArtistSlugRef.current ?? draft.createdArtistSlug
        const completedKeys = new Set([...draft.uploadedFileKeys, ...uploadedFilesRef.current])
        if (!artistSlug) {
          const res = await fetch('/api/artists', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            if (res.status === 409 && recoverExistingProfile) artistSlug = await recoverExistingProfile()
            if (!artistSlug) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error ?? '申請失敗，請稍後再試')
            }
          } else {
            const artist = await res.json()
            if (controller.signal.aborted) return
            artistSlug = artist.slug
          }
          createdArtistSlugRef.current = artistSlug
        }
        if (!artistSlug) throw new Error('申請回應不完整，請重新整理確認申請狀態。')
        // Save the server checkpoint before starting uploads. Retrying never
        // creates another profile, including after a page reload.
        const uploadIds = { ...draft.uploadIds }
        draft.files.forEach((file, index) => {
          const key = `${index}:${onboardingFileKey(file)}`
          uploadIds[key] ??= crypto.randomUUID()
        })
        let checkpoint = { ...draft, step: 4, createdArtistSlug: artistSlug, uploadedFileKeys: [...completedKeys], uploadIds }
        setDraft(checkpoint)
        try { await save(checkpoint) } catch {
          if (!skipPortfolio && draft.files.length > 0) throw new Error('申請已保存，但圖片重試資料無法保存。請恢復瀏覽器儲存功能，或選擇稍後補作品。')
        }

        // Every selected file must reach the portfolio endpoint before the
        // application completes. Keep successful files in the ref and retry
        // only failures, while the parent-owned selection stays untouched.
        if (!skipPortfolio && portfolio.files.length > 0) {
          const pendingFiles = draft.files.map((file, index) => ({ file, key: `${index}:${onboardingFileKey(file)}` })).filter(({ key }) => !completedKeys.has(key))
          // Persist each completed file before moving to the next, so a reload
          // during recovery does not re-upload previously saved portfolio items.
          const failedFiles: File[] = []
          for (const { file, key } of pendingFiles) {
            if (controller.signal.aborted) return
            try {
              const publicUrl = await uploadFile('portfolio', file, controller.signal)
              const response = await fetch(`/api/artists/${artistSlug}/portfolio`, {
                method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: publicUrl, idempotency_key: uploadIds[key] }),
              })
              if (!response.ok) throw new Error('作品資料儲存失敗')
            } catch { failedFiles.push(file); continue }
            completedKeys.add(key)
            uploadedFilesRef.current.add(key)
            checkpoint = { ...checkpoint, uploadedFileKeys: [...completedKeys] }
            setDraft(checkpoint)
            try { await save(checkpoint) } catch {
              throw new Error('這張作品已保存，但本機重試進度無法保存，已停止後續上傳。請恢復瀏覽器儲存功能後重試，或稍後到作品集確認。')
            }
          }
          if (failedFiles.length > 0) {
            setUploadFailures(failedFiles.map((file) => file.name))
            throw new Error(`有 ${failedFiles.length} 張作品上傳失敗。請重試失敗的檔案；已成功上傳的作品不會重複送出。`)
          }
        }

        if (controller.signal.aborted) return
        await onProfileCreated?.(artistSlug)
        if (controller.signal.aborted) return
        await finish()
        setIsComplete(true)
      } catch (err) {
        if (controller.signal.aborted) return
        setSubmitError(err instanceof Error ? err.message : '申請失敗，請稍後再試')
      } finally {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    },
    [basicInfo, stylePicker, priceLocation, portfolio.files.length, draft, loaded, setDraft, save, finish, onProfileCreated, recoverExistingProfile],
  )

  if (!loaded) return <p role="status" className="py-12 text-muted-foreground">正在讀取入駐草稿…</p>

  if (locked) return <div role="status" className="space-y-4 py-12"><p>這份入駐草稿正在另一個分頁編輯。請先關閉另一個入駐分頁，再重新載入。</p><button className="v2-button" onClick={() => window.location.reload()}>重新載入草稿</button></div>

  if (isComplete || alreadySubmitted) {
    return <OnboardingComplete />
  }

  return (
    <div className="space-y-6" ref={contentRef}>
      {step === 1 && <p className="text-sm text-muted-foreground">填寫基本資料、選擇風格與參考起價，再確認申請。作品可稍後補上；審核通過後才會公開。</p>}
      {accountId && <p role="status" className="text-sm text-muted-foreground">{saveStatus === 'unavailable' ? '目前無法保存草稿，請勿關閉或重新整理此頁。' : saveStatus === 'saving' ? '正在保存草稿…' : recovered ? '已恢復草稿，資料已保存在這台裝置。' : '草稿已保存於此裝置（7 天）。清除瀏覽器資料會移除草稿。'}</p>}
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
          <section aria-label="送出前確認" className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
            <h2 className="font-semibold">送出前確認</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt>公開名稱</dt><dd className="break-words">{basicInfo.display_name}</dd>
              <dt>服務地區</dt><dd>{priceLocation.cities.join('、') || '尚未選擇'} {priceLocation.district}</dd>
              <dt>參考起價</dt><dd>NT$ {priceLocation.price_min || '—'}{priceLocation.price_max && `，參考上限 NT$ ${priceLocation.price_max}`}</dd>
              <dt>刺青風格</dt><dd>{stylePicker.selectedSlugs.map(onboardingStyleLabel).join('、') || '尚未選擇'}</dd>
              <dt>作品</dt><dd>{draft.files.length} 張{draft.files.length === 0 && '，送出後仍可補上'}</dd>
            </dl>
            <p className="text-muted-foreground">名稱、簡介、風格、地區與參考價將用於公開檔案；LINE 登入識別資料不會公開。</p>
            {draft.createdArtistSlug && <p role="status">申請資料已保存；重試只會補上未完成的作品並同步帳號，不會重複申請。</p>}
          </section>
          <StepPortfolio
            data={portfolio}
            onChange={setPortfolio}
            onSubmit={() => handleSubmit(false)}
            onSkip={() => handleSubmit(true)}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
            profileCreated={!!draft.createdArtistSlug}
            managePreviews
          />
        </>
      )}
    </div>
  )
}
