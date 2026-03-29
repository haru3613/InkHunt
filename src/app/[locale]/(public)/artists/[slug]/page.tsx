import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { getArtistBySlug, getArtists } from "@/lib/supabase/queries/artists"

const getCachedArtist = cache(getArtistBySlug)
import { formatPriceRange } from "@/lib/utils"
import { generateArtistJsonLd } from "@/lib/seo"
import { JsonLd } from "@/components/shared/JsonLd"
import { BackButton } from "@/components/artists/BackButton"
import { ArtistProfile } from "@/components/artists/ArtistProfile"
import { ArtistCompareAction } from "@/components/artists/ArtistCompareAction"
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
  const artist = await getCachedArtist(slug)

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
  const artist = await getCachedArtist(slug)

  if (!artist) {
    notFound()
  }

  const jsonLd = generateArtistJsonLd(artist)

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <BackButton />

        <div className="mt-4 lg:flex lg:gap-8">
          {/* Left column — artist info (sticky on desktop) */}
          <div className="lg:w-[340px] lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <ArtistProfile artist={artist} />
              <div className="mt-3">
                <ArtistCompareAction
                  artist={{
                    id: artist.id,
                    display_name: artist.display_name,
                    slug: artist.slug,
                    avatar_url: artist.avatar_url ?? null,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right column — portfolio */}
          <div className="mt-6 min-w-0 flex-1 lg:mt-0">
            <h2 className="font-display mb-4 text-lg font-bold text-foreground">
              {t("portfolio")}
            </h2>
            <PortfolioSection items={artist.portfolio_items} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <MobileCTA artistId={artist.id} artistName={artist.display_name} />
    </>
  )
}
