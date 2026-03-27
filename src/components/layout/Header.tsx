"use client"

import { useTranslations } from "next-intl"
import { UserIcon } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/hooks/useAuth"

export function Header() {
  const t = useTranslations("nav")
  const { isLoggedIn, user, loginWithRedirect } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          InkHunt
        </Link>

        {isLoggedIn && user ? (
          <Link
            href="/artist"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                <UserIcon className="size-4 text-muted-foreground" />
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => loginWithRedirect('/')}
            className="font-display text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("login")}
          </button>
        )}
      </div>
    </header>
  )
}
