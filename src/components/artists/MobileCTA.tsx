"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

interface MobileCTAProps {
  readonly slug: string
}

export function MobileCTA({ slug }: MobileCTAProps) {
  const t = useTranslations("artistProfile")

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-4 lg:hidden">
      <Link
        href={`/artists/${slug}/inquiry`}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-amber-500 text-base font-medium text-white transition-colors hover:bg-amber-600"
      >
        {t("inquire")}
      </Link>
    </div>
  )
}
