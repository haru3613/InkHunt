import type { Metadata } from "next"
import { Noto_Sans_TC } from "next/font/google"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { MobileNav } from "@/components/layout/MobileNav"
import "./globals.css"

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-tc",
})

export const metadata: Metadata = {
  title: {
    template: "%s | InkHunt",
    default: "InkHunt — 找到你的刺青師",
  },
  description:
    "台灣第一個刺青師媒合平台。按風格篩選、瀏覽作品集、價格透明、一鍵詢價。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className={`${notoSansTC.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  )
}
