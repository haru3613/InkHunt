'use client'

import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { ArtistTopBar } from '@/components/artists/ArtistTopBar'

function ArtistLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const { artist, user } = useAuth()
  const showNav = artist?.status === 'active'

  if (!showNav) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A]">
      <ArtistTopBar
        artistName={artist?.display_name ?? user?.displayName ?? null}
        avatarUrl={user?.avatarUrl ?? null}
      />
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
