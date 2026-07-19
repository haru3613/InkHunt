import { setRequestLocale, getTranslations } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { StyleGrid } from "@/components/artists/StyleGrid"
import { ArtistCard } from "@/components/artists/ArtistCard"
import { ColdStartInvite } from "@/components/home/ColdStartInvite"
import { JsonLd } from "@/components/shared/JsonLd"
import {
  getAllStyles,
  getAllArtistCounts,
  getStyleSampleImages,
} from "@/lib/supabase/queries/styles"
import { getFeaturedArtists, getNewArtists } from "@/lib/supabase/queries/artists"
import { generateWebsiteJsonLd } from "@/lib/seo"

const HERO_BG_URL =
  "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1920&q=80"

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations("home")

  const [styles, featuredArtists, newArtists, artistCounts, styleSampleImages] =
    await Promise.all([
      getAllStyles(),
      getFeaturedArtists(6),
      getNewArtists(8),
      getAllArtistCounts(),
      getStyleSampleImages(),
    ])

  // Supabase helpers may return Map or plain record depending on query layer.
  const countsMap: Map<string, number> =
    artistCounts instanceof Map
      ? artistCounts
      : new Map(Object.entries(artistCounts as Record<string, number>))

  const sampleMap: Map<string, string> =
    styleSampleImages instanceof Map
      ? styleSampleImages
      : new Map(Object.entries(styleSampleImages as Record<string, string>))

  const isColdStart =
    featuredArtists.length === 0 &&
    newArtists.length === 0 &&
    [...countsMap.values()].every((n) => n === 0)

  const websiteJsonLd = generateWebsiteJsonLd()

  return (
    <>
      <JsonLd data={websiteJsonLd} />

      {/* Hero — full-bleed poster */}
      <section className="relative z-0 flex min-h-svh items-end">
        <Image
          src={HERO_BG_URL}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,10,0)_0%,rgba(10,10,10,0.7)_50%,rgba(10,10,10,0.95)_100%)]" />

        <div className="relative z-10 container mx-auto px-4 pb-16 pt-32 lg:pb-24">
          <h1 className="font-display text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em] text-foreground">
            {t("heroTitleLine1")}
            <br />
            <span className="text-primary">{t("heroTitleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/artists"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-primary px-8 text-sm font-medium text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-accent-hover"
            >
              {t("startSearch")}
            </Link>
            <Link
              href="/artist"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-border px-8 text-sm font-medium text-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
            >
              {t("iAmArtist")}
            </Link>
          </div>
        </div>
      </section>

      {isColdStart ? <ColdStartInvite /> : null}

      {/* Featured artists */}
      {featuredArtists.length > 0 && (
        <section className="border-b border-border py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-primary">
              {t("sectionLabelFeatured")}
            </p>
            <h2 className="font-display mt-2 text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-foreground">
              {t("recommended")}
            </h2>
            <div className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-x-visible lg:grid-cols-3">
              {featuredArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New artists */}
      {newArtists.length > 0 && (
        <section
          data-testid="new-artists-section"
          className="border-b border-border py-16 lg:py-24"
        >
          <div className="container mx-auto px-4">
            <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-primary">
              {t("sectionLabelNew")}
            </p>
            <h2 className="font-display mt-2 text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-foreground">
              {t("newArtists")}
            </h2>
            <div className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-x-visible lg:grid-cols-3">
              {newArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Style categories */}
      <section id="styles" className="border-b border-border py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-primary">
            {t("sectionLabelStyles")}
          </p>
          <h2 className="font-display mt-2 text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-foreground">
            {t("browseByStyle")}
          </h2>
          {isColdStart ? (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t("styleSectionColdStartHint")}
            </p>
          ) : null}
          <div className="mt-8">
            <StyleGrid
              styles={styles}
              artistCounts={countsMap}
              sampleImages={sampleMap}
            />
          </div>
        </div>
      </section>
    </>
  )
}
