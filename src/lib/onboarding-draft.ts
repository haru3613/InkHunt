/**
 * Local-only recovery state for the artist onboarding wizard.  Files are kept
 * as File objects so IndexedDB stores their bytes; object URLs are deliberately
 * never persisted because they do not survive a reload.
 */
export interface OnboardingDraft {
  version: 1
  step: number
  basicInfo: {
    display_name: string
    ig_handle: string
    bio: string
  }
  stylePicker: {
    selectedSlugs: string[]
    canCover: boolean
    acceptCustom: boolean
    hasFlashDesigns: boolean
  }
  priceLocation: {
    cities: string[]
    district: string
    price_min: string
    price_max: string
    pricing_note: string
  }
  files: File[]
  createdArtistSlug: string | null
  uploadedFileKeys: string[]
  /** Stable idempotency IDs for file metadata keys, retained across reloads. */
  uploadIds?: Record<string, string>
  updatedAt: number
}

const DATABASE_NAME = 'inkhunt-onboarding-drafts'
const DATABASE_VERSION = 1
const STORE_NAME = 'drafts'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_FILE_BYTES = 100 * 1024 * 1024
const MAX_FILES = 20
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_CITIES = 22
const OPEN_TIMEOUT_MS = 10_000
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function isStringArray(value: unknown, maxItems: number, maxStringLength: number): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => isString(item, maxStringLength))
}

function isValidFile(value: unknown): value is File {
  return typeof File !== 'undefined'
    && value instanceof File
    && ALLOWED_FILE_TYPES.has(value.type)
    && value.size >= 0
    && value.size <= MAX_FILE_BYTES
}

/** A deterministic key used to remember which selected file has completed upload. */
export function onboardingFileKey(file: File): string {
  return `${file.name}\u0000${file.type}\u0000${file.size}\u0000${file.lastModified}`
}

/**
 * Strictly validates data read from browser storage before it reaches the UI.
 * It intentionally permits incomplete text fields: the wizard saves progress,
 * while the server remains responsible for submit-time validation.
 */
export function isValidOnboardingDraft(value: unknown): value is OnboardingDraft {
  if (!isRecord(value)
    || value.version !== 1
    || typeof value.step !== 'number'
    || !Number.isInteger(value.step)
    || value.step < 1
    || value.step > 4) {
    return false
  }
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt <= 0) return false

  const basicInfo = value.basicInfo
  if (!isRecord(basicInfo)
    || !isString(basicInfo.display_name, 100)
    || !isString(basicInfo.ig_handle, 64)
    || !isString(basicInfo.bio, 2_000)) return false

  const stylePicker = value.stylePicker
  if (!isRecord(stylePicker)
    || !isStringArray(stylePicker.selectedSlugs, 5, 100)
    || !stylePicker.selectedSlugs.every((slug, index, slugs) => slug.length > 0 && slugs.indexOf(slug) === index)
    || typeof stylePicker.canCover !== 'boolean'
    || typeof stylePicker.acceptCustom !== 'boolean'
    || typeof stylePicker.hasFlashDesigns !== 'boolean') return false

  const priceLocation = value.priceLocation
  if (!isRecord(priceLocation)
    || !isStringArray(priceLocation.cities, MAX_CITIES, 64)
    || !priceLocation.cities.every((city, index, cities) => city.length > 0 && cities.indexOf(city) === index)
    || !isString(priceLocation.district, 100)
    || !isString(priceLocation.price_min, 32)
    || !isString(priceLocation.price_max, 32)
    || !isString(priceLocation.pricing_note, 1_000)) return false

  if (!Array.isArray(value.files) || value.files.length > MAX_FILES || !value.files.every(isValidFile)) return false
  if (value.files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_FILE_BYTES) return false

  if (value.createdArtistSlug !== null && !isString(value.createdArtistSlug, 160)) return false
  if (!isStringArray(value.uploadedFileKeys, MAX_FILES, 512)) return false
  if (value.uploadIds !== undefined
    && (!isRecord(value.uploadIds)
      || Object.keys(value.uploadIds).length > MAX_FILES
      || !Object.entries(value.uploadIds).every(([key, id]) => isString(key, 512) && isString(id, 36) && UUID_PATTERN.test(id)))) return false
  return true
}

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this browser')
  }
  return indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => finishReject(new Error('Timed out opening onboarding draft storage')), OPEN_TIMEOUT_MS)
    const finishResolve = (database: IDBDatabase) => {
      if (settled) {
        database.close()
        return
      }
      settled = true
      clearTimeout(timeout)
      resolve(database)
    }
    const finishReject = (error: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    }
    let request: IDBOpenDBRequest
    try {
      request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION)
    } catch (error) {
      finishReject(error instanceof Error ? error : new Error('Unable to open onboarding draft storage'))
      return
    }
    request.onerror = () => finishReject(request.error ?? new Error('Unable to open onboarding draft storage'))
    request.onblocked = () => finishReject(new Error('Onboarding draft storage is blocked by another tab'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => finishResolve(request.result)
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    let settled = false
    const finishReject = (error: Error) => {
      if (settled) return
      settled = true
      database.close()
      reject(error)
    }
    const finishResolve = (result: T) => {
      if (settled) return
      settled = true
      database.close()
      resolve(result)
    }
    let transaction: IDBTransaction
    try {
      transaction = database.transaction(STORE_NAME, mode)
    } catch (error) {
      finishReject(error instanceof Error ? error : new Error('Unable to open onboarding draft transaction'))
      return
    }
    let request: IDBRequest<T>
    try {
      request = run(transaction.objectStore(STORE_NAME))
    } catch (error) {
      finishReject(error instanceof Error ? error : new Error('Onboarding draft storage operation failed'))
      return
    }
    request.onerror = () => finishReject(request.error ?? new Error('Onboarding draft storage operation failed'))
    transaction.onerror = () => finishReject(transaction.error ?? new Error('Onboarding draft storage transaction failed'))
    transaction.onabort = () => finishReject(transaction.error ?? new Error('Onboarding draft storage transaction aborted'))
    transaction.oncomplete = () => {
      finishResolve(request.result)
    }
  }))
}

function validateAccountId(accountId: string): void {
  if (!accountId) throw new Error('An account ID is required for onboarding draft storage')
}

/**
 * Acquires a non-blocking, account-scoped writer lock. The caller must invoke
 * the returned release function when it no longer owns persistence. A null
 * result means another tab is currently writing this account's draft.
 */
export function acquireOnboardingDraftLock(accountId: string): Promise<(() => void) | null> {
  validateAccountId(accountId)
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return Promise.reject(new Error('Web Locks are unavailable in this browser'))
  }

  return new Promise((resolve, reject) => {
    let resolved = false
    try {
      const request = navigator.locks.request(
        `inkhunt:onboarding-draft:${accountId}`,
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            resolved = true
            resolve(null)
            return
          }

          await new Promise<void>((release) => {
            resolved = true
            resolve(release)
          })
        },
      )
      void request.catch((error) => {
        if (!resolved) reject(error instanceof Error ? error : new Error('Unable to acquire onboarding draft lock'))
      })
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Unable to acquire onboarding draft lock'))
    }
  })
}

export async function readOnboardingDraft(accountId: string): Promise<OnboardingDraft | null> {
  validateAccountId(accountId)
  const value = await withStore<unknown>('readonly', (store) => store.get(accountId))
  if (value === undefined) return null

  if (!isValidOnboardingDraft(value) || Date.now() - value.updatedAt > MAX_AGE_MS || value.updatedAt > Date.now() + MAX_FUTURE_CLOCK_SKEW_MS) {
    await clearOnboardingDraft(accountId)
    return null
  }
  return value
}

export async function writeOnboardingDraft(accountId: string, draft: OnboardingDraft): Promise<void> {
  validateAccountId(accountId)
  if (!isValidOnboardingDraft(draft)) throw new Error('Refusing to persist an invalid onboarding draft')
  await withStore<IDBValidKey>('readwrite', (store) => store.put(draft, accountId))
}

export async function clearOnboardingDraft(accountId: string): Promise<void> {
  validateAccountId(accountId)
  await withStore<undefined>('readwrite', (store) => store.delete(accountId))
}
