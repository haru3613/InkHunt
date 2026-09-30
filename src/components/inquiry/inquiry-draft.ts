import { BUDGET_RANGES } from '@/lib/validations/inquiry'

const DRAFT_PREFIX = 'inkhunt:inquiry-draft:'
export const INQUIRY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export interface InquiryDraftForm {
  description: string
  body_part: string
  size_estimate: string
  budget_range: string
}

export interface InquiryDraft {
  form: InquiryDraftForm
  referenceImages: string[]
  savedAt: number
}

function keyFor(artistId: string) {
  return `${DRAFT_PREFIX}${artistId}`
}

function isString(value: unknown, max: number) {
  return typeof value === 'string' && value.length <= max
}

/** Treat sessionStorage as untrusted input: malformed and expired data is removed. */
export function readInquiryDraft(artistId: string, now = Date.now()): InquiryDraft | null {
  if (typeof window === 'undefined') return null
  const key = keyFor(artistId)
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const draft: unknown = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || !('savedAt' in draft) || !('form' in draft) || !('referenceImages' in draft)) {
      window.sessionStorage.removeItem(key)
      return null
    }
    const { savedAt, form, referenceImages } = draft as Record<string, unknown>
    if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || savedAt > now || now - savedAt > INQUIRY_DRAFT_TTL_MS || !form || typeof form !== 'object' || !Array.isArray(referenceImages)) {
      window.sessionStorage.removeItem(key)
      return null
    }
    const fields = form as Record<string, unknown>
    if (!isString(fields.description, 1000) || !isString(fields.body_part, 100) || !isString(fields.size_estimate, 200) || !isString(fields.budget_range, 32) || (fields.budget_range !== '' && !BUDGET_RANGES.includes(fields.budget_range as typeof BUDGET_RANGES[number])) || referenceImages.length > 3 || !referenceImages.every((image) => typeof image === 'string' && image.length <= 2048)) {
      window.sessionStorage.removeItem(key)
      return null
    }
    return {
      form: {
        description: fields.description as string,
        body_part: fields.body_part as string,
        size_estimate: fields.size_estimate as string,
        budget_range: fields.budget_range as string,
      },
      referenceImages: [...referenceImages],
      savedAt,
    }
  } catch {
    try { window.sessionStorage.removeItem(key) } catch { /* storage can be disabled */ }
    return null
  }
}

export function saveInquiryDraft(artistId: string, form: InquiryDraftForm, referenceImages: readonly string[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(keyFor(artistId), JSON.stringify({ form, referenceImages: [...referenceImages], savedAt: Date.now() } satisfies InquiryDraft))
  } catch {
    // A full or disabled storage area must not prevent the user from inquiring.
  }
}

export function clearInquiryDraft(artistId: string) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(keyFor(artistId)) } catch { /* storage may be disabled */ }
}
