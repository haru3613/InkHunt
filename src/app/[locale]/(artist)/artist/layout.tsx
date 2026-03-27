'use client'

import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { ArtistDashboardNav } from '@/components/artists/ArtistDashboardNav'

function ArtistLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const { artist } = useAuth()
  const showNav = artist?.status === 'active'

  if (!showNav) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <ArtistDashboardNav />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
    </div>
  )
}

export default function ArtistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <ArtistLayoutInner>{children}</ArtistLayoutInner>
    </AuthProvider>
  )
}
