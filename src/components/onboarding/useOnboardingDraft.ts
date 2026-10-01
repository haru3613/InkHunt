'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { acquireOnboardingDraftLock, clearOnboardingDraft, readOnboardingDraft, writeOnboardingDraft, type OnboardingDraft } from '@/lib/onboarding-draft'

function initialDraft(name: string): OnboardingDraft {
  return {
    version: 1, step: 1, updatedAt: Date.now(),
    basicInfo: { display_name: name, ig_handle: '', bio: '' },
    stylePicker: { selectedSlugs: [], canCover: false, acceptCustom: true, hasFlashDesigns: false },
    priceLocation: { cities: [], district: '', price_min: '', price_max: '', pricing_note: '' },
    files: [], createdArtistSlug: null, uploadedFileKeys: [],
  }
}

// The page keys this component by account ID. A previous account's async saves
// may finish only under that account's key; no draft or file URLs cross users.
export function useOnboardingDraft(accountId: string | undefined, name: string, initialArtistSlug?: string) {
  const [draft, setDraft] = useState(() => initialDraft(name))
  const [loaded, setLoaded] = useState(!accountId)
  const [locked, setLocked] = useState(false)
  const canPersist = useRef(false)
  const [recovered, setRecovered] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saving')
  const initial = useRef({ name, initialArtistSlug })
  const writeQueue = useRef(Promise.resolve())
  const finished = useRef(false)
  const mounted = useRef(true)
  const saveVersion = useRef(0)

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    let releaseLock: (() => void) | null = null
    if (!accountId) return () => { mounted.current = false }
    void (async () => {
      try {
        releaseLock = await acquireOnboardingDraftLock(accountId)
        // React Strict Mode can remount before the preceding Web Lock's release
        // has been acknowledged. Briefly retry that handoff, never steal a lock.
        for (let attempt = 0; !releaseLock && !cancelled && attempt < 2; attempt++) {
          await new Promise(resolve => window.setTimeout(resolve, 30))
          if (!cancelled) releaseLock = await acquireOnboardingDraftLock(accountId)
        }
        if (cancelled) { releaseLock?.(); return }
        if (!releaseLock) { setLocked(true); return }
        canPersist.current = true
        const saved = await readOnboardingDraft(accountId)
        if (cancelled) return
        const existing = initial.current.initialArtistSlug
        // A server-confirmed profile wins over an old/new-tab draft. Only a
        // checkpoint for that exact profile may resume interrupted uploads.
        if (existing && saved && saved.createdArtistSlug === null && saved.files.length > 0) {
          // The create response can be lost after the server committed. Keep
          // the user's selected files and resume against the verified profile.
          setDraft({ ...saved, step: 4, createdArtistSlug: existing })
          setRecovered(true)
        } else if (existing && saved?.createdArtistSlug !== existing) {
          finished.current = true
          setAlreadySubmitted(true)
          await clearOnboardingDraft(accountId)
        } else if (saved) {
          setDraft(saved)
          setRecovered(true)
        }
        if (!cancelled) setSaveStatus('saved')
      } catch {
        if (!cancelled) {
          setSaveStatus('unavailable')
          if (initial.current.initialArtistSlug) {
            finished.current = true
            setAlreadySubmitted(true)
          }
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
      mounted.current = false
      // Do not let the next tab acquire ownership until this tab's final queued
      // write has finished, otherwise an old write could replace the new draft.
      void writeQueue.current.catch(() => {}).then(() => releaseLock?.())
    }
  }, [accountId])

  const save = useCallback((snapshot: OnboardingDraft) => {
    if (!accountId || finished.current) return Promise.resolve()
    if (!canPersist.current) return Promise.reject(new Error('草稿儲存不可用'))
    const version = ++saveVersion.current
    if (mounted.current) setSaveStatus('saving')
    const operation = writeQueue.current.catch(() => {}).then(() => writeOnboardingDraft(accountId, { ...snapshot, updatedAt: Date.now() }))
    writeQueue.current = operation
    void operation.then(() => {
      if (mounted.current && version === saveVersion.current) setSaveStatus('saved')
    }, () => {
      if (mounted.current && version === saveVersion.current) setSaveStatus('unavailable')
    })
    return operation
  }, [accountId])

  useEffect(() => {
    if (loaded && !locked && !alreadySubmitted) void save(draft).catch(() => {})
  }, [draft, loaded, locked, alreadySubmitted, save])

  const finish = useCallback(async () => {
    finished.current = true
    await writeQueue.current.catch(() => {})
    if (accountId && canPersist.current) {
      try { await clearOnboardingDraft(accountId) } catch {
        // The server profile prevents stale local drafts from creating a second
        // application. An unavailable browser store must not undo a saved one.
        if (mounted.current) setSaveStatus('unavailable')
      }
    }
  }, [accountId])

  return { draft, setDraft, loaded, locked, recovered, alreadySubmitted, saveStatus, save, finish }
}
