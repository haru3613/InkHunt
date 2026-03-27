import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { getArtistBySlug, getArtists } from "@/lib/supabase/queries/artists"
import { formatPriceRange } from "@/lib/utils"
import { generateArtistJsonLd } from "@/lib/seo"
import { JsonLd } from "@/components/shared/JsonLd"
import { BackButton } from "@/components/artists/BackButton"
import { ArtistProfile } from "@/components/artists/ArtistProfile"
import { PortfolioSection } from "@/components/artists/PortfolioSection"
import { MobileCTA } from "@/components/artists/MobileCTA"

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const { data: artists } = await getArtists()
  return artists.map((artist) => ({ slug: artist.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })
  const artist = await getArtistBySlug(slug)

  if (!artist) {
    return { title: t("artistNotFound") }
  }

  const stylesText = artist.styles.map((s) => s.name).join("、")
  const priceText = formatPriceRange(artist.price_min, artist.price_max) ?? ""
  const locationText = [artist.city, artist.district].filter(Boolean).join(" ")

  const descriptionParts = [
    stylesText && `風格：${stylesText}`,
    locationText && `地點：${locationText}`,
    priceText && `價格：${priceText}`,
  ].filter(Boolean)

  return {
    title: t("artistPortfolio", { name: artist.display_name }),
    description:
      descriptionParts.length > 0
        ? `${artist.display_name} 的刺青作品集。${descriptionParts.join("｜")}。在 InkHunt 瀏覽作品、一鍵詢價。`
        : `${artist.display_name} 的刺青作品集。在 InkHunt 瀏覽作品、一鍵詢價。`,
    openGraph: {
      title: t('artistPortfolio', { name: artist.display_name }),
      description: artist.bio ?? `${artist.display_name} 的刺青作品集`,
      images: artist.avatar_url ? [{ url: artist.avatar_url }] : undefined,
    },
  }
}

export default async function ArtistProfilePage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations("artistProfile")
  const artist = await getArtistBySlug(slug)

  if (!artist) {
    notFound()
  }

  const jsonLd = generateArtistJsonLd(artist)

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <BackButton />

        <div className="mt-4">
          <ArtistProfile artist={artist} />
        </div>

        {/* Portfolio */}
        <div className="mt-6">
          <h2 className="font-display mb-4 text-lg font-bold text-foreground">
            {t("portfolio")}
          </h2>
          <PortfolioSection items={artist.portfolio_items} />
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <MobileCTA artistId={artist.id} artistName={artist.display_name} />
    </>
  )
}
