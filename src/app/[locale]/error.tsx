"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

// HAR-663: branded zh-TW/en boundary for uncaught errors within a locale
// segment, replacing Next's default English error screen.
//
// Hook point for the sibling error-tracking ticket: swap this console.error
// for `Sentry.captureException(error)` (or similar) once that ticket lands.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("errors")

  useEffect(() => {
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-[#F5F0EB]">
        {t("title")}
      </h1>
      <p className="max-w-md text-sm text-[#8A8A8A]">{t("description")}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button variant="outline" render={<Link href="/">{t("goHome")}</Link>} />
      </div>
    </div>
  )
}
