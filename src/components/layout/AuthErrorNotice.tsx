'use client'

import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/navigation'
import { lineLoginUrl } from '@/lib/auth/login-url'

export function AuthErrorNotice() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const en = useLocale() === 'en'
  const error = params.get('auth_error')
  if (!error) return null
  const message = error === 'invalid_state'
    ? (en ? 'This login link has expired. Please sign in again.' : '登入連結已失效，請重新登入。')
    : error === 'access_denied'
      ? (en ? 'LINE sign-in was cancelled. You can retry or keep browsing.' : '尚未完成 LINE 登入，可以重試或先繼續瀏覽。')
      : (en ? 'Sign-in did not complete. Please try again.' : '登入尚未完成，請再試一次。')
  const dismiss = () => {
    const next = new URLSearchParams(params.toString())
    next.delete('auth_error'); next.delete('returnTo')
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, {scroll:false})
  }
  return <div role="alert" className="v2-container my-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 text-sm">
    <p className="flex-1 basis-60">{message}</p>
    <a className="min-h-11 content-center font-medium text-primary underline underline-offset-4" href={lineLoginUrl(params.get('returnTo') || `/${en ? 'en' : 'zh-TW'}${pathname}`)}>{en ? 'Sign in again' : '重新登入'}</a>
    <button className="min-h-11 text-muted-foreground" onClick={dismiss}>{en ? 'Dismiss' : '先繼續瀏覽'}</button>
  </div>
}
