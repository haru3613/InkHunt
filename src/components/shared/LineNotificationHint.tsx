'use client'

import { useLocale } from 'next-intl'

/** Optional, explicitly configured Official Account. Never infer it from a secret token. */
export function LineNotificationHint() {
  const en = useLocale() === 'en'
  const configured = process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL
  let href: string | null = null
  try {
    const url = configured ? new URL(configured) : null
    if (url?.protocol === 'https:' && ['line.me', 'lin.ee'].includes(url.hostname)) href = url.toString()
  } catch { /* An invalid optional link must not break the primary workflow. */ }

  return <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
    <p>{en ? 'All replies and appointment updates are saved here. Check your conversations for the latest status.' : '回覆與預約更新都會保存在站內，請到對話中查看最新狀態。'}</p>
    {href && <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
      {en ? 'Add our LINE Official Account for reminders' : '加入 LINE 官方帳號，接收提醒'}
    </a>}
    {href && <p className="text-xs">{en ? 'LINE reminders require adding the account as a friend. If a reminder is delayed, the status here remains available.' : '需先加入官方帳號好友，才能接收 LINE 提醒；提醒若延遲，仍可在站內查看。'}</p>}
  </div>
}
