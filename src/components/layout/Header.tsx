"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { UserIcon, LogOut } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/hooks/useAuth"

function DevLoginButton({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDevLogin = useCallback(async () => {
    setIsLoading(true)
    try {
      const adminId = process.env.NEXT_PUBLIC_DEV_ADMIN_LINE_USER_ID ?? 'dev-user-001'
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: adminId, display_name: 'Dev Admin' }),
      })
      if (res.ok) onSuccess()
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess])

  return (
    <button
      onClick={handleDevLogin}
      disabled={isLoading}
      className="rounded bg-amber-600/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-600/30 disabled:opacity-50"
    >
      {isLoading ? '...' : 'Dev Login'}
    </button>
  )
}

export function Header() {
  const t = useTranslations("nav")
  const { isLoggedIn, user, loginWithRedirect, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    setMenuOpen(false)
    await logout()
    router.push("/")
  }, [logout, router])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          InkHunt
        </Link>

        {isDev && !isLoggedIn && (
          <DevLoginButton onSuccess={() => router.refresh()} />
        )}

        {isLoggedIn && user ? (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName}
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <UserIcon className="size-4 text-muted-foreground" />
                </div>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-[#1F1F1F] bg-[#141414] py-1 shadow-xl">
                <Link
                  href="/artist"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-[#F5F0EB]/80 transition-colors hover:bg-[#1F1F1F]"
                >
                  刺青師後台
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#f87171]/80 transition-colors hover:bg-[#1F1F1F]"
                >
                  <LogOut className="size-3.5" />
                  登出
                </button>
              </div>
            )}
          </div>
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
