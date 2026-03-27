import { setRequestLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { StyleGrid } from "@/components/artists/StyleGrid"
import { ArtistCard } from "@/components/artists/ArtistCard"
import { JsonLd } from "@/components/shared/JsonLd"
import { getAllStyles, getAllArtistCounts } from "@/lib/supabase/queries/styles"
import { getFeaturedArtists } from "@/lib/supabase/queries/artists"
import { generateWebsiteJsonLd } from "@/lib/seo"

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

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-foreground">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              render={<Link href="/artists" />}
              size="lg"
              className="bg-primary text-white hover:bg-ink-accent-hover"
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
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display mb-6 text-2xl font-bold text-foreground">
              {t("recommended")}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-x-visible lg:grid-cols-3">
              {featuredArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Style categories */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="font-display mb-6 text-2xl font-bold text-foreground">
            {t("browseByStyle")}
          </h2>
          <StyleGrid styles={styles} artistCounts={artistCounts} />
        </div>
      </section>
    </>
  )
}
