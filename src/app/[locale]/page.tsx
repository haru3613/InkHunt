import { setRequestLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { StyleGrid } from "@/components/artists/StyleGrid"
import { ArtistCard } from "@/components/artists/ArtistCard"
import { JsonLd } from "@/components/shared/JsonLd"
import { getAllStyles, getAllArtistCounts } from "@/lib/supabase/queries/styles"
import { getFeaturedArtists } from "@/lib/supabase/queries/artists"
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

  const [styles, featuredArtists, artistCounts] = await Promise.all([
    getAllStyles(),
    getFeaturedArtists(6),
    getAllArtistCounts(),
  ])

  const websiteJsonLd = generateWebsiteJsonLd()

  return (
    <>
      <JsonLd data={websiteJsonLd} />

      {/* Hero — full-bleed poster */}
      <section
        className="relative flex min-h-svh items-end bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${HERO_BG_URL})`,
        }}
      >
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,10,0)_0%,rgba(10,10,10,0.7)_50%,rgba(10,10,10,0.95)_100%)]" />

        {/* Hero content — left-aligned, bottom */}
        <div className="relative z-10 container mx-auto px-4 pb-16 pt-32 lg:pb-24">
          <h1 className="font-display text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em] text-foreground">
            {t("heroTitleLine1")}
            <br />
            <span className="text-primary">{t("heroTitleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex gap-4">
            <Button
              render={<Link href="/artists" />}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-ink-accent-hover"
            >
              {t("startSearch")}
            </Button>
            <Button render={<Link href="/artist" />} variant="outline" size="lg">
              {t("iAmArtist")}
            </Button>
          </div>
        </div>
      </section>

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

      {/* Style categories */}
      <section className="border-b border-border py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <p
            className="font-display text-xs font-medium uppercase text-primary"
            style={{ letterSpacing: "0.15em" }}
          >
            {t("sectionLabelStyles")}
          </p>
          <h2
            className="font-display mt-2 font-bold text-foreground"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
          >
            {t("browseByStyle")}
          </h2>
          <div className="mt-8">
            <StyleGrid styles={styles} artistCounts={artistCounts} />
          </div>
        </div>
      </section>
    </>
  )
}
