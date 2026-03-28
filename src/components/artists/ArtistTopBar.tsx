'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'
import { MessageSquare, FolderOpen, User, LayoutDashboard, ChevronDown } from 'lucide-react'

interface ArtistTopBarProps {
  artistName: string | null
  avatarUrl: string | null
}

const NAV_ITEMS = [
  { href: '/artist/dashboard', label: '總覽', icon: LayoutDashboard },
  { href: '/artist/inquiries', label: '詢價', icon: MessageSquare },
  { href: '/artist/portfolio', label: '作品集', icon: FolderOpen },
  { href: '/artist/profile', label: '檔案', icon: User },
] as const

function safeInitials(name: string | null): string {
  if (!name) return '?'
  return getInitials(name)
}

export function ArtistTopBar({ artistName, avatarUrl }: ArtistTopBarProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = safeInitials(artistName)

  return (
    <>
      {/* Top bar — 48px mobile, 56px desktop */}
      <header className="sticky top-0 z-40 h-12 lg:h-14 bg-[#0A0A0A] border-b border-[#2A2A2A] flex items-center px-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-lg font-bold text-[#C8A97E] hover:text-[#E8D5B5] transition-colors duration-200 shrink-0"
        >
          InkHunt
        </Link>

        {/* Desktop nav items */}
        <nav className="hidden lg:flex items-center gap-1 ml-8">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname.includes(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative px-3 py-1.5 text-sm font-medium uppercase tracking-[0.05em] transition-colors duration-200',
                  'font-sans',
                  isActive
                    ? 'text-[#F5F0EB]'
                    : 'text-[#8A8A8A] hover:text-[#F5F0EB]',
                )}
              >
                {label}
                {/* Active underline — 2px brass */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C8A97E]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-sm p-1 hover:bg-[#1C1C1C] transition-colors duration-200"
            aria-label="帳號選單"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            {/* Avatar */}
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={artistName ?? '刺青師頭像'}
                width={32}
                height={32}
                className="rounded-full object-cover h-8 w-8"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1C1C] border border-[#2A2A2A] text-xs font-medium text-[#C8A97E] font-display">
                {initials}
              </span>
            )}

            {/* Display name — desktop only */}
            <span className="hidden lg:block text-sm text-[#F5F0EB] font-sans max-w-[120px] truncate">
              {artistName ?? '刺青師'}
            </span>

            <ChevronDown
              className={cn(
                'hidden lg:block h-4 w-4 text-[#8A8A8A] transition-transform duration-200',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-44 rounded-sm border border-[#2A2A2A] bg-[#141414] py-1 shadow-xl"
            >
              <Link
                href="/artist/profile"
                role="menuitem"
                className="block px-4 py-2 text-sm text-[#F5F0EB] hover:bg-[#1C1C1C] transition-colors duration-200 font-sans"
                onClick={() => setDropdownOpen(false)}
              >
                個人檔案
              </Link>
              <div className="my-1 border-t border-[#2A2A2A]" />
              <Link
                href="/"
                role="menuitem"
                className="block px-4 py-2 text-sm text-[#8A8A8A] hover:text-[#F5F0EB] hover:bg-[#1C1C1C] transition-colors duration-200 font-sans"
                onClick={() => setDropdownOpen(false)}
              >
                回到首頁
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#2A2A2A] bg-[#0A0A0A]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.includes(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors duration-200 font-sans',
                isActive ? 'text-[#C8A97E]' : 'text-[#8A8A8A]',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
