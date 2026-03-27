"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, SearchIcon, HeartIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/", label: "首頁", icon: HomeIcon },
  { href: "/artists", label: "找刺青師", icon: SearchIcon },
  { href: "/favorites", label: "收藏", icon: HeartIcon },
  { href: "/artist", label: "設計師", icon: UserIcon },
] as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile tab navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white lg:hidden"
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "text-amber-500"
                  : "text-stone-400 hover:text-stone-600"
              )}
            >
              <Icon className="size-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
