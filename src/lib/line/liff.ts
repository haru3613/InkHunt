'use client'

import liff from '@line/liff'

let initialized = false

export async function initLiff(): Promise<typeof liff> {
  if (initialized) return liff
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID
  if (!liffId) throw new Error('NEXT_PUBLIC_LINE_LIFF_ID is not configured')
  await liff.init({ liffId })
  initialized = true
  return liff
}

export async function liffLogin(): Promise<string | null> {
  const client = await initLiff()
  if (!client.isLoggedIn()) {
    client.login()
    return null
  }
  return client.getIDToken()
}

export function isInLiff(): boolean {
  return typeof window !== 'undefined' && liff.isInClient()
}
