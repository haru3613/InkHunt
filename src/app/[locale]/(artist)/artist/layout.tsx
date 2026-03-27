import { ArtistDashboardNav } from '@/components/artists/ArtistDashboardNav'

export default function ArtistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <ArtistDashboardNav />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
    </div>
  )
}
