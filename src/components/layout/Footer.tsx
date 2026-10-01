"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"

export function Footer() {
  const en = useLocale() === 'en'
  const t = useTranslations("footer")
  const tNav = useTranslations("nav")

  const footerLinks = [
    { href: "/artist" as const, label: tNav("becomeArtist") },
    { href: "/about" as const, label: t("about") },
    { href: "/privacy" as const, label: t("privacy") },
    { href: "/terms" as const, label: t("terms") },
  ]

  return (
    <footer className="border-t border-border bg-ink-surface pb-24 pt-12 lg:pb-12">
      <div className="v2-container">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} InkHunt · {en ? "Free for everyone. No commission." : "雙方免費，不收取任何抽成。"}
          </p>
          <nav aria-label="Footer links" className="flex flex-wrap justify-center gap-5">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
