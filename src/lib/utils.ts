import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return `NT$${amount.toLocaleString('en-US')}`
}

export function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min == null && max == null) return null
  if (min != null && max != null) return `${formatPrice(min)}~${formatPrice(max)}`
  if (min != null) return `${formatPrice(min)} 起`
  return `最高 ${formatPrice(max!)}`
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return '剛剛'
  if (diffHours < 1) return `${diffMinutes} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return new Date(isoString).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function formatIgUrl(handle: string): string | null {
  const IG_HANDLE_REGEX = /^@?[\w.][\w.]{0,29}$/
  if (!IG_HANDLE_REGEX.test(handle)) return null
  const cleaned = handle.startsWith('@') ? handle.slice(1) : handle
  return `https://instagram.com/${cleaned}`
}
