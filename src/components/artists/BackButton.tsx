"use client"

import { useRouter } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

export function BackButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-0.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
    >
      <ChevronLeftIcon className="size-4" />
      <span>返回</span>
    </button>
  )
}
