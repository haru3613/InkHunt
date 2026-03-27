"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

interface MobileCTAProps {
  readonly slug: string
}

export function MobileCTA({ slug }: MobileCTAProps) {
  const t = useTranslations("artistProfile")

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4 lg:hidden">
      <Link
        href={`/artists/${slug}/inquiry`}
        className="flex h-12 w-full items-center justify-center rounded-sm bg-primary text-base font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover"
      >
        {t("inquire")}
      </Link>
    </div>
  )
}
