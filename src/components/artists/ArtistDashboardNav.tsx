'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, User, Image, Settings, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/artist/dashboard', label: '詢價', icon: MessageSquare },
  { href: '/artist/profile', label: '個人檔案', icon: User },
  { href: '/artist/portfolio', label: '作品集', icon: Image },
  { href: '/artist/settings', label: '設定', icon: Settings },
] as const

export function ArtistDashboardNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex flex-col w-60 border-r border-[#1F1F1F] bg-[#0A0A0A] p-4 gap-1">
        <div className="px-3 py-4 mb-2">
          <Link href="/" className="font-display text-lg font-bold text-[#C8A97E] hover:text-[#C8A97E]/80 transition-colors">
            InkHunt
          </Link>
          <p className="text-xs text-[#F5F0EB]/30 mt-0.5">刺青師後台</p>
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-[#1F1F1F] text-[#C8A97E]'
                : 'text-[#F5F0EB]/60 hover:text-[#F5F0EB] hover:bg-[#141414]',
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#1F1F1F] bg-[#0A0A0A]">
        <Link
          href="/"
          className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-[#F5F0EB]/40"
        >
          <Home className="w-5 h-5" />
          首頁
        </Link>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-[#C8A97E]'
                : 'text-[#F5F0EB]/40',
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
