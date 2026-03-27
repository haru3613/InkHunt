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

export function formatIgUrl(handle: string): string | null {
  const IG_HANDLE_REGEX = /^@?[\w.][\w.]{0,29}$/
  if (!IG_HANDLE_REGEX.test(handle)) return null
  const cleaned = handle.startsWith('@') ? handle.slice(1) : handle
  return `https://instagram.com/${cleaned}`
}
