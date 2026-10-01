import { describe, expect, it } from 'vitest'
import {
  acquireOnboardingDraftLock,
  clearOnboardingDraft,
  isValidOnboardingDraft,
  onboardingFileKey,
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingDraft,
} from '@/lib/onboarding-draft'

function draft(overrides: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    version: 1,
    step: 1,
    basicInfo: { display_name: '', ig_handle: '', bio: '' },
    stylePicker: { selectedSlugs: [], canCover: false, acceptCustom: true, hasFlashDesigns: false },
    priceLocation: { cities: [], district: '', price_min: '', price_max: '', pricing_note: '' },
    files: [],
    createdArtistSlug: null,
    uploadedFileKeys: [],
    updatedAt: Date.now(),
    ...overrides,
  }
}

function installIndexedDbFake(options: { failOperation?: 'put' } = {}) {
  const records = new Map<string, unknown>()
  const makeRequest = <T>(result: T, transaction: { oncomplete: (() => void) | null }, error: Error | null = null) => {
    const request = { result, error, onerror: null, onsuccess: null } as unknown as IDBRequest<T>
    queueMicrotask(() => {
      if (error) request.onerror?.(new Event('error'))
      else request.onsuccess?.(new Event('success'))
      transaction.oncomplete?.()
    })
    return request
  }
  const database = {
    objectStoreNames: { contains: () => false },
    createObjectStore: () => null,
    close: () => undefined,
    transaction: () => {
      const transaction = { error: null, onerror: null, onabort: null, oncomplete: null }
      const store = {
        get: (key: string) => makeRequest(records.get(key), transaction),
        put: (value: unknown, key: string) => {
          if (options.failOperation === 'put') return makeRequest(key, transaction, new Error('quota exceeded'))
          records.set(key, value)
          return makeRequest(key, transaction)
        },
        delete: (key: string) => {
          records.delete(key)
          return makeRequest(undefined, transaction)
        },
      }
      Object.assign(transaction, { objectStore: () => store })
      return transaction as unknown as IDBTransaction
    },
  } as unknown as IDBDatabase
  const factory = {
    open: () => {
      const request = { result: database, error: null, onerror: null, onsuccess: null, onupgradeneeded: null } as unknown as IDBOpenDBRequest
      queueMicrotask(() => {
        request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent)
        request.onsuccess?.(new Event('success'))
      })
      return request
    },
  } as unknown as IDBFactory
  const original = globalThis.indexedDB
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: factory })
  return () => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: original })
}

function installWebLocksFake() {
  const heldNames = new Set<string>()
  const locks = {
    request: async (
      name: string,
      options: { ifAvailable?: boolean },
      callback: (lock: Lock | null) => Promise<void>,
    ) => {
      if (options.ifAvailable && heldNames.has(name)) return callback(null)
      heldNames.add(name)
      try {
        await callback({ name } as Lock)
      } finally {
        heldNames.delete(name)
      }
    },
  }
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'locks')
  Object.defineProperty(globalThis.navigator, 'locks', { configurable: true, value: locks })
  return () => {
    if (original) Object.defineProperty(globalThis.navigator, 'locks', original)
    else Reflect.deleteProperty(globalThis.navigator, 'locks')
  }
}

async function flushLockRelease(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('onboarding draft validation', () => {
  it('accepts an incomplete, recoverable draft with a supported File', () => {
    const file = new File(['tattoo'], 'work.jpg', { type: 'image/jpeg', lastModified: 123 })
    expect(isValidOnboardingDraft(draft({ step: 4, files: [file] }))).toBe(true)
  })

  it('rejects out-of-range steps, overlong text, and too many styles', () => {
    expect(isValidOnboardingDraft(draft({ step: 5 }))).toBe(false)
    expect(isValidOnboardingDraft(draft({ basicInfo: { display_name: 'x'.repeat(101), ig_handle: '', bio: '' } }))).toBe(false)
    expect(isValidOnboardingDraft(draft({ stylePicker: { selectedSlugs: ['a', 'b', 'c', 'd', 'e', 'f'], canCover: false, acceptCustom: true, hasFlashDesigns: false } }))).toBe(false)
    expect(isValidOnboardingDraft(draft({ priceLocation: { cities: Array.from({ length: 22 }, (_, index) => `city-${index}`), district: '', price_min: '', price_max: '', pricing_note: '' } }))).toBe(true)
    expect(isValidOnboardingDraft(draft({ priceLocation: { cities: Array.from({ length: 23 }, (_, index) => `city-${index}`), district: '', price_min: '', price_max: '', pricing_note: '' } }))).toBe(false)
  })

  it('rejects disallowed, oversized, and excessive image payloads', () => {
    const pdf = new File(['document'], 'work.pdf', { type: 'application/pdf' })
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
    const image = new File(['image'], 'work.webp', { type: 'image/webp' })
    expect(isValidOnboardingDraft(draft({ files: [pdf] }))).toBe(false)
    expect(isValidOnboardingDraft(draft({ files: [oversized] }))).toBe(false)
    expect(isValidOnboardingDraft(draft({ files: Array.from({ length: 21 }, () => image) }))).toBe(false)
  })

  it('requires all service fields and completion keys to have their expected types', () => {
    const malformed = draft() as unknown as { stylePicker: { canCover: string }, uploadedFileKeys: unknown[] }
    malformed.stylePicker.canCover = 'true'
    malformed.uploadedFileKeys = [42]
    expect(isValidOnboardingDraft(malformed)).toBe(false)
  })

  it('validates optional file-key to UUID idempotency mappings', () => {
    expect(isValidOnboardingDraft(draft({ uploadIds: { 'work.jpg\u0000image/jpeg\u00001\u00001': '0b3f7ef1-f54b-4c02-9912-4d1b6c6ac041' } }))).toBe(true)
    expect(isValidOnboardingDraft(draft({ uploadIds: { work: 'not-a-uuid' } }))).toBe(false)
  })
})

describe('onboardingFileKey', () => {
  it('is stable for the same file metadata and changes when upload identity changes', () => {
    const first = new File(['one'], 'work.jpg', { type: 'image/jpeg', lastModified: 12 })
    const sameMetadata = new File(['two'], 'work.jpg', { type: 'image/jpeg', lastModified: 12 })
    const changed = new File(['two'], 'work.jpg', { type: 'image/jpeg', lastModified: 13 })
    expect(onboardingFileKey(first)).toBe(onboardingFileKey(sameMetadata))
    expect(onboardingFileKey(first)).not.toBe(onboardingFileKey(changed))
  })
})

describe('onboarding IndexedDB adapter', () => {
  it('keeps File objects, upload recovery metadata, and accounts isolated', async () => {
    const restore = installIndexedDbFake()
    try {
      const file = new File(['tattoo'], 'work.jpg', { type: 'image/jpeg', lastModified: 42 })
      const saved = draft({
        files: [file],
        createdArtistSlug: 'pending-artist',
        uploadedFileKeys: [onboardingFileKey(file)],
      })
      await writeOnboardingDraft('account-a', saved)
      expect(await readOnboardingDraft('account-a')).toEqual(saved)
      expect((await readOnboardingDraft('account-a'))?.files[0]).toBe(file)
      expect(await readOnboardingDraft('account-b')).toBeNull()
      await clearOnboardingDraft('account-a')
      expect(await readOnboardingDraft('account-a')).toBeNull()
    } finally {
      restore()
    }
  })

  it('removes an expired draft before returning null', async () => {
    const restore = installIndexedDbFake()
    try {
      await writeOnboardingDraft('account-a', draft({ updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }))
      expect(await readOnboardingDraft('account-a')).toBeNull()
      expect(await readOnboardingDraft('account-a')).toBeNull()
    } finally {
      restore()
    }
  })

  it('rejects failed storage writes instead of reporting a false save', async () => {
    const restore = installIndexedDbFake({ failOperation: 'put' })
    try {
      await expect(writeOnboardingDraft('account-a', draft())).rejects.toThrow('quota exceeded')
    } finally {
      restore()
    }
  })

  it('rejects when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined })
    try {
      await expect(readOnboardingDraft('account-a')).rejects.toThrow('IndexedDB is unavailable')
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: original })
    }
  })
})

describe('onboarding draft writer lock', () => {
  it('denies a competing same-account writer, then permits it after release', async () => {
    const restore = installWebLocksFake()
    try {
      const first = await acquireOnboardingDraftLock('account-a')
      expect(first).toBeTypeOf('function')
      expect(await acquireOnboardingDraftLock('account-a')).toBeNull()
      first?.()
      await flushLockRelease()
      const second = await acquireOnboardingDraftLock('account-a')
      expect(second).toBeTypeOf('function')
      second?.()
    } finally {
      restore()
    }
  })

  it('allows separate accounts to each hold a writer lock', async () => {
    const restore = installWebLocksFake()
    try {
      const first = await acquireOnboardingDraftLock('account-a')
      const second = await acquireOnboardingDraftLock('account-b')
      expect(first).toBeTypeOf('function')
      expect(second).toBeTypeOf('function')
      first?.()
      second?.()
    } finally {
      restore()
    }
  })

  it('rejects when Web Locks are unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'locks')
    Reflect.deleteProperty(globalThis.navigator, 'locks')
    try {
      await expect(acquireOnboardingDraftLock('account-a')).rejects.toThrow('Web Locks are unavailable')
    } finally {
      if (original) Object.defineProperty(globalThis.navigator, 'locks', original)
    }
  })

  it('surfaces a rejected Web Locks request', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'locks')
    Object.defineProperty(globalThis.navigator, 'locks', {
      configurable: true,
      value: { request: () => Promise.reject(new Error('lock request rejected')) },
    })
    try {
      await expect(acquireOnboardingDraftLock('account-a')).rejects.toThrow('lock request rejected')
    } finally {
      if (original) Object.defineProperty(globalThis.navigator, 'locks', original)
      else Reflect.deleteProperty(globalThis.navigator, 'locks')
    }
  })
})
