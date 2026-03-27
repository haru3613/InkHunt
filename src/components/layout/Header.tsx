"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

const navLinks = [
  { href: "/artists", label: "找刺青師" },
  { href: "/artist", label: "設計師入口" },
] as const

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-stone-900">
          InkHunt
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
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
            <span className="sr-only">開啟選單</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle>InkHunt</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2 px-4">
              {navLinks.map((link) => (
                <SheetClose key={link.href} render={<Link href={link.href} />}>
                  <span className="block rounded-lg px-3 py-2 text-base font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900">
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
