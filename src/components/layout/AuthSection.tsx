'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { UserIcon, LogOut, ChevronDown } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { Link, useRouter } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'

const DEV_TEST_USERS = [
  { lineUserId: 'consumer-001', displayName: '小明', label: 'Consumer (has inquiries)' },
  { lineUserId: 'consumer-002', displayName: '小美', label: 'Consumer (fresh)' },
  { lineUserId: 'consumer-003', displayName: '阿偉', label: 'Consumer (quote requests)' },
  { lineUserId: 'artist-inked-wolf', displayName: 'InkedWolf 刺青', label: 'Artist (active)' },
  { lineUserId: 'artist-sakura-ink', displayName: 'Sakura Ink', label: 'Artist (active)' },
  { lineUserId: 'artist-shadow-line', displayName: 'Shadow Line', label: 'Artist (active)' },
  { lineUserId: 'artist-new-talent', displayName: 'New Talent', label: 'Artist (pending)' },
  { lineUserId: 'artist-bare-bones', displayName: 'Bare Bones', label: 'Artist (incomplete)' },
  { lineUserId: 'U770e3788b27c6cdeb9248b9f7139f171', displayName: 'Harvey', label: 'Admin + Artist' },
] as const

function DevLoginPicker({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogin = useCallback(async (lineUserId: string, displayName: string) => {
    setIsLoading(lineUserId)
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: lineUserId, display_name: displayName }),
      })
      if (res.ok) {
        setIsOpen(false)
        onSuccess()
      }
    } finally {
      setIsLoading(null)
    }
  }, [onSuccess])

  return (
    <div ref={pickerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 rounded bg-amber-600/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-600/30"
      >
        Dev Login
        <ChevronDown className="size-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Test Users
          </div>
          {DEV_TEST_USERS.map((user) => (
            <button
              key={user.lineUserId}
              onClick={() => handleLogin(user.lineUserId, user.displayName)}
              disabled={isLoading !== null}
              className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">
                  {isLoading === user.lineUserId ? '...' : user.displayName}
                </div>
                <div className="text-[10px] text-muted-foreground">{user.label}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface AuthSectionProps {
  readonly loginLabel: string
}

export function AuthSection({ loginLabel }: AuthSectionProps) {
  const { isLoggedIn, isAdmin, user, loginWithRedirect, logout, refetch } = useAuth()
  const en = useLocale() === 'en'
  const t = useTranslations('nav')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    setMenuOpen(false)
    await logout()
    router.push('/')
  }, [logout, router])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev && !isLoggedIn) {
    return <DevLoginPicker onSuccess={() => { void refetch(); router.refresh() }} />
  }

  if (isLoggedIn && user) {
    return (
      <div ref={menuRef} className="relative">
        <button
          aria-label={en ? "Account menu" : "帳號選單"}
          aria-expanded={menuOpen}
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
          <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-border bg-card py-1 shadow-xl">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-primary transition-colors hover:bg-muted"
              >
                {t('admin')}
              </Link>
            )}
            <Link
              href="/artist"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              {en ? 'Artist workspace' : '刺青師工作室'}
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" />
              {en ? 'Log out' : '登出'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => loginWithRedirect(window.location.pathname + window.location.search)}
      className="font-display text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {loginLabel}
    </button>
  )
}
