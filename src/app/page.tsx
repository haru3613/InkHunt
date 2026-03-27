import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StyleGrid } from "@/components/artists/StyleGrid"
import { ArtistCard } from "@/components/artists/ArtistCard"
import { JsonLd } from "@/components/shared/JsonLd"
import { getAllStyles, getAllArtistCounts } from "@/lib/supabase/queries/styles"
import { getFeaturedArtists } from "@/lib/supabase/queries/artists"
import { generateWebsiteJsonLd } from "@/lib/seo"

export default async function HomePage() {
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
      <section className="bg-stone-50 py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 lg:text-5xl">
            找到你的刺青師
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-500">
            按風格篩選、瀏覽作品集、價格透明、一鍵詢價。不用再一個一個 IG
            私訊問價了。
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              render={<Link href="/artists" />}
              size="lg"
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              開始找刺青師
            </Button>
            <Button render={<Link href="/artist" />} variant="outline" size="lg">
              我是刺青師
            </Button>
          </div>
        </div>
      </section>

      {/* Featured artists */}
      {featuredArtists.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="mb-6 text-2xl font-bold text-stone-900">
              推薦刺青師
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
          <h2 className="mb-6 text-2xl font-bold text-stone-900">
            按風格找刺青師
          </h2>
          <StyleGrid styles={styles} artistCounts={artistCounts} />
        </div>
      </section>
    </>
  )
}
