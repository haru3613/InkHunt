'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { BottomDrawer, BottomDrawerContent, BottomDrawerDescription, BottomDrawerHeader, BottomDrawerTitle } from '@/components/ui/bottom-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReferenceImageUpload } from './ReferenceImageUpload'
import { clearInquiryDraft, readInquiryDraft, saveInquiryDraft, type InquiryDraftForm } from './inquiry-draft'
import { BODY_PARTS, BUDGET_RANGES, inquirySchema } from '@/lib/validations/inquiry'
import { useAuth } from '@/hooks/useAuth'
import { trackSubmitInquiry } from '@/lib/analytics'
import type { ZodError } from 'zod'

interface InquiryFormProps { readonly artistId: string; readonly artistName: string; readonly artistSlug?: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void }
type Step = 1 | 2 | 3
type FormState = InquiryDraftForm
const EMPTY_FORM: FormState = { description: '', body_part: '', size_estimate: '', budget_range: '' }

const copy = {
  'zh-TW': { title: (name: string) => `向 ${name} 免費送出詢價`, subtitle: '花一分鐘說說你的想法，刺青師會先確認細節。', steps: ['想法', '細節', '確認'], description: '你想刺什麼？', descriptionHint: '題材、風格、想保留的感覺都可以寫。', reference: '參考圖片', loginUpload: '登入後即可上傳參考圖片', body: '想刺在哪裡？', bodyPlaceholder: '選擇部位', size: '大約多大？', sizePlaceholder: '例如：5 x 5 cm，或一個掌心大小', budget: '預算範圍', budgetPlaceholder: '選擇預算範圍', back: '上一步', next: '下一步', review: '查看確認內容', submit: '免費送出詢價', login: 'LINE 登入後免費送出', note: '詢價不代表預約。刺青師確認細節與可行性後，再由你決定是否預約；日期也會在聊天室確認。', summary: '請確認你的需求', required: '此欄位必填', invalidIdea: '請至少描述 10 個字，讓刺青師更了解你的想法。', invalidDetails: '請完成部位與大小。', error: '送出失敗，請稍後再試。' },
  en: { title: (name: string) => `Send a free inquiry to ${name}`, subtitle: 'Share your idea in a minute. Your artist will confirm the details first.', steps: ['Idea', 'Details', 'Review'], description: 'What would you like tattooed?', descriptionHint: 'Tell us the subject, style, and feeling you want to keep.', reference: 'Reference images', loginUpload: 'Sign in to add reference images', body: 'Where would you like it?', bodyPlaceholder: 'Choose a placement', size: 'About what size?', sizePlaceholder: 'For example: 5 x 5 cm or palm-sized', budget: 'Budget range', budgetPlaceholder: 'Choose a budget range', back: 'Back', next: 'Continue', review: 'Review inquiry', submit: 'Send free inquiry', login: 'Sign in with LINE to send', note: 'An inquiry is not a booking. Decide whether to book after your artist confirms the details and feasibility; dates are confirmed in chat.', summary: 'Review your request', required: 'Required', invalidIdea: 'Please add at least 10 characters so the artist understands your idea.', invalidDetails: 'Please choose a placement and enter a size.', error: 'We could not send your inquiry. Please try again.' },
} as const

function flattenZodErrors(error: ZodError): Record<string, string> { return error.issues.reduce<Record<string, string>>((all, issue) => { const key = issue.path.join('.'); if (!all[key]) all[key] = issue.message; return all }, {}) }

export function InquiryForm({ artistId, artistName, artistSlug, open, onOpenChange }: InquiryFormProps) {
  const locale = useLocale()
  const text = copy[locale === 'en' ? 'en' : 'zh-TW']
  const { isLoggedIn, loginWithRedirect } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionInFlight = useRef(false)
  const restoredArtistId = useRef<string | null>(null)

  useEffect(() => {
    if (!open || restoredArtistId.current === artistId) return
    restoredArtistId.current = artistId
    const draft = readInquiryDraft(artistId)
    if (!draft) return
    queueMicrotask(() => { setForm(draft.form); setReferenceImages(draft.referenceImages) })
  }, [artistId, open])

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => { if (!previous[field]) return previous; const rest = { ...previous }; delete rest[field]; return rest })
  }, [])
  const saveDraft = useCallback(() => saveInquiryDraft(artistId, form, referenceImages), [artistId, form, referenceImages])
  const validateStep = useCallback((target: Step) => {
    const values = target === 1
      ? { description: form.description, body_part: 'draft', size_estimate: 'draft', reference_images: [] }
      : { description: 'temporary valid description', body_part: form.body_part, size_estimate: form.size_estimate, reference_images: [] }
    const result = inquirySchema.safeParse(values)
    if (!result.success) {
      const relevant = result.error.issues.filter((issue) => target === 1 ? issue.path[0] === 'description' : issue.path[0] === 'body_part' || issue.path[0] === 'size_estimate')
      if (relevant.length) { setErrors(flattenZodErrors({ ...result.error, issues: relevant })); return false }
    }
    setErrors({}); return true
  }, [form])
  const next = useCallback(() => { if (!validateStep(step)) return; saveDraft(); setStep((current) => (current === 3 ? current : current + 1) as Step) }, [saveDraft, step, validateStep])
  const login = useCallback(() => { saveDraft(); const current = new URL(window.location.href); current.searchParams.set('inquiry', '1'); loginWithRedirect(`${current.pathname}${current.search}`) }, [loginWithRedirect, saveDraft])
  const submit = useCallback(async () => {
    if (!isLoggedIn) { login(); return }
    if (submissionInFlight.current) return
    const parsed = inquirySchema.safeParse({ description: form.description, body_part: form.body_part, size_estimate: form.size_estimate, reference_images: referenceImages })
    if (!parsed.success) { setErrors(flattenZodErrors(parsed.error)); setStep(parsed.error.issues.some((issue) => issue.path[0] === 'description') ? 1 : 2); return }
    submissionInFlight.current = true; setIsSubmitting(true); setErrors({})
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artist_id: artistId, ...parsed.data, budget_range: form.budget_range || undefined }) })
      if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; throw new Error(payload?.error ?? text.error) }
      const { id } = await response.json()
      if (artistSlug) trackSubmitInquiry(artistSlug, form.body_part || undefined, form.budget_range || undefined)
      clearInquiryDraft(artistId); onOpenChange(false); router.push(`/inquiries/${id}`)
    } catch (error) { setErrors({ _form: error instanceof Error ? error.message : text.error }) }
    finally { submissionInFlight.current = false; setIsSubmitting(false) }
  }, [artistId, artistSlug, form, isLoggedIn, login, onOpenChange, referenceImages, router, text.error])

  const budgetLabels: Record<string, string> = locale === 'en'
    ? { under_3k: 'Under NT$3,000', '3k_8k': 'NT$3,000–8,000', '8k_20k': 'NT$8,000–20,000', '20k_50k': 'NT$20,000–50,000', over_50k: 'Over NT$50,000', unsure: 'Not sure yet' }
    : { under_3k: 'NT$3,000 以下', '3k_8k': 'NT$3,000–8,000', '8k_20k': 'NT$8,000–20,000', '20k_50k': 'NT$20,000–50,000', over_50k: 'NT$50,000 以上', unsure: '還不確定，先聊聊' }
  const budgetItems = BUDGET_RANGES.map((value) => ({ value, label: budgetLabels[value] }))
  const summary = [[text.description, form.description], [text.body, form.body_part], [text.size, form.size_estimate], [text.budget, form.budget_range ? budgetItems.find((item) => item.value === form.budget_range)?.label : '—']]
  return <BottomDrawer open={open} onOpenChange={(nextOpen) => { if (!nextOpen) saveDraft(); onOpenChange(nextOpen) }}><BottomDrawerContent className="bg-background text-foreground"><BottomDrawerHeader><BottomDrawerTitle>{text.title(artistName)}</BottomDrawerTitle><BottomDrawerDescription>{text.subtitle}</BottomDrawerDescription></BottomDrawerHeader><form className="space-y-5 overflow-y-auto bg-background px-4 pb-6" onSubmit={(event) => { event.preventDefault(); if (step === 3) submit(); else next() }}>
    <ol aria-label={locale === 'en' ? 'Inquiry progress' : '詢價進度'} className="grid grid-cols-3 gap-2 text-center text-sm">{text.steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step >= index + 1 ? 'font-semibold text-primary' : 'text-muted-foreground'}>{index + 1}. {label}</li>)}</ol>
    {step === 1 && <section aria-labelledby="idea-step" className="space-y-4 rounded-lg bg-card p-4 shadow-sm"><h3 id="idea-step" className="font-semibold">{text.steps[0]}</h3><div className="space-y-1.5"><label htmlFor="inquiry-description" className="text-sm font-medium">{text.description} <span className="text-ink-error">{text.required}</span></label><Textarea id="inquiry-description" value={form.description} maxLength={1000} onChange={(event) => updateField('description', event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby="description-help description-error" className="min-h-28 rounded-lg" placeholder={text.descriptionHint} /><div className="flex justify-between text-xs text-muted-foreground"><span id="description-help">{text.descriptionHint}</span><span>{form.description.length}/1000</span></div>{errors.description && <p id="description-error" role="alert" className="text-sm text-ink-error">{locale === 'en' ? text.invalidIdea : errors.description}</p>}</div><div className="space-y-2"><p className="text-sm font-medium">{text.reference}</p>{isLoggedIn ? <ReferenceImageUpload images={referenceImages} onImagesChange={setReferenceImages} /> : <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{text.loginUpload}</p>}</div></section>}
    {step === 2 && <section aria-labelledby="details-step" className="space-y-4 rounded-lg bg-card p-4 shadow-sm"><h3 id="details-step" className="font-semibold">{text.steps[1]}</h3><div className="space-y-1.5"><label id="inquiry-body-label" className="text-sm font-medium">{text.body} <span className="text-ink-error">{text.required}</span></label><Select items={BODY_PARTS.map((value) => ({ value, label: value }))} value={form.body_part} onValueChange={(value) => updateField('body_part', value ?? '')}><SelectTrigger className="h-11 w-full rounded-lg" aria-labelledby="inquiry-body-label" aria-invalid={Boolean(errors.body_part)}><SelectValue placeholder={text.bodyPlaceholder} /></SelectTrigger><SelectContent>{BODY_PARTS.map((part) => <SelectItem key={part} value={part}>{part}</SelectItem>)}</SelectContent></Select>{errors.body_part && <p role="alert" className="text-sm text-ink-error">{locale === 'en' ? text.invalidDetails : errors.body_part}</p>}</div><div className="space-y-1.5"><label htmlFor="inquiry-size" className="text-sm font-medium">{text.size} <span className="text-ink-error">{text.required}</span></label><Input id="inquiry-size" value={form.size_estimate} maxLength={200} onChange={(event) => updateField('size_estimate', event.target.value)} aria-invalid={Boolean(errors.size_estimate)} className="h-11 rounded-lg" placeholder={text.sizePlaceholder} />{errors.size_estimate && <p role="alert" className="text-sm text-ink-error">{locale === 'en' ? text.invalidDetails : errors.size_estimate}</p>}</div><div className="space-y-1.5"><label id="inquiry-budget-label" className="text-sm font-medium">{text.budget}</label><Select name="budget_range" items={budgetItems} value={form.budget_range} onValueChange={(value) => updateField('budget_range', value ?? '')}><SelectTrigger aria-labelledby="inquiry-budget-label" className="h-11 w-full rounded-lg"><SelectValue placeholder={text.budgetPlaceholder} /></SelectTrigger><SelectContent>{budgetItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></section>}
    {step === 3 && <section aria-labelledby="review-step" className="space-y-4 rounded-lg bg-card p-4 shadow-sm"><h3 id="review-step" className="font-semibold">{text.summary}</h3><dl className="space-y-3">{summary.map(([term, definition]) => <div key={String(term)}><dt className="text-sm text-muted-foreground">{term}</dt><dd className="whitespace-pre-wrap font-medium">{definition}</dd></div>)}</dl><p className="rounded-lg bg-secondary p-3 text-sm leading-6">{text.note}</p></section>}
    {errors._form && <p role="alert" className="text-sm text-ink-error">{errors._form}</p>}<div className="flex gap-3"><Button type="button" variant="outline" className="h-11 flex-1 rounded-lg" onClick={() => { saveDraft(); setStep((current) => Math.max(1, current - 1) as Step) }} disabled={step === 1 || isSubmitting}>{text.back}</Button><Button type="submit" className="h-11 flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-ink-accent-hover" disabled={isSubmitting}>{step === 3 ? (isLoggedIn ? text.submit : text.login) : step === 2 ? text.review : text.next}</Button></div>
  </form></BottomDrawerContent></BottomDrawer>
}
