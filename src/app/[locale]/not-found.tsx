import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

// HAR-663: branded 404 for a bad URL within a locale segment (e.g. a missing
// /artists/[slug]), replacing Next's default English not-found screen.
// This component has no route params — the segment's locale is read via
// next-intl/server's getLocale().
export default async function LocaleNotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFound" })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-[#F5F0EB]">
        {t("title")}
      </h1>
      <p className="max-w-md text-sm text-[#8A8A8A]">{t("description")}</p>
      <Button variant="outline" render={<Link href="/">{t("goHome")}</Link>} />
    </div>
  )
}
