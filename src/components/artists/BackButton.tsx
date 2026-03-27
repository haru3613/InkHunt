"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { ChevronLeftIcon } from "lucide-react"

export function BackButton() {
  const router = useRouter()
  const t = useTranslations("artistProfile")

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" />
      <span>{t("back")}</span>
    </button>
  )
}
