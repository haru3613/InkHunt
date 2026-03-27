'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isArtistDashboard = /\/artist(\/|$)/.test(pathname)

  if (isArtistDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  )
}
