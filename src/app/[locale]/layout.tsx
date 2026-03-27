import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Noto_Sans_TC } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { routing } from "@/i18n/routing"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { MobileNav } from "@/components/layout/MobileNav"

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-tc",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: {
      template: "%s | InkHunt",
      default: t("defaultTitle"),
    },
    description: t("defaultDescription"),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html lang={locale} className={`${notoSansTC.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1 pb-16 lg:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
