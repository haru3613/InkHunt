import type { ReactNode } from "react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { MobileNav } from "@/components/layout/MobileNav"
import { CompareWrapper } from "@/components/layout/CompareWrapper"
import { AuthProvider } from "@/hooks/useAuth"

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthProvider>
      <Header />
      <CompareWrapper>
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      </CompareWrapper>
      <Footer />
      <MobileNav />
    </AuthProvider>
  )
}
