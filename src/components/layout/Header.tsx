"use client"

import { useTranslations } from "next-intl"
import { MenuIcon } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

export function Header() {
  const t = useTranslations("nav")

  const navLinks = [
    { href: "/artists" as const, label: t("findArtist") },
    { href: "/artist" as const, label: t("artistEntry") },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          InkHunt
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden" />
            }
          >
            <MenuIcon className="size-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>InkHunt</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2 px-4">
              {navLinks.map((link) => (
                <SheetClose key={link.href} render={<Link href={link.href} />}>
                  <span className="block rounded-lg px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {link.label}
                  </span>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
