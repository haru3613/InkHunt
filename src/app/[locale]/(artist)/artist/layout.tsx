'use client'

import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { ArtistTopBar } from '@/components/artists/ArtistTopBar'

function ArtistLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  const { artist, user } = useAuth()
  const showNav = artist?.status === 'active'

  if (!showNav) {
    return <><header className="v2-container flex h-[72px] items-center justify-between border-b border-border"><Link href="/" className="v2-wordmark text-3xl">InkHunt.</Link><nav className="flex items-center gap-4 text-sm">{artist && <><Link href="/artist/profile">個人資料</Link><Link href="/artist/portfolio">作品集</Link></>}<Link href="/" className="text-muted-foreground">回到網站</Link></nav></header><main>{children}</main></>
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2]">
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
