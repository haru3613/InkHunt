import { Suspense, type ReactNode } from "react"
import { AuthErrorNotice } from "@/components/layout/AuthErrorNotice"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { MobileNav } from "@/components/layout/MobileNav"
import { AuthProvider } from "@/hooks/useAuth"

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthProvider>
      <Header />
      <Suspense><AuthErrorNotice /></Suspense>
        <main id="main-content" className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </AuthProvider>
  )
}
