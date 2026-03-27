import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { StyleGrid } from "@/components/artists/StyleGrid"
import { JsonLd } from "@/components/shared/JsonLd"
import { getAllStyles, getAllArtistCounts } from "@/lib/supabase/queries/styles"
import { getFeaturedArtists, type ArtistWithDetails } from "@/lib/supabase/queries/artists"
import { generateWebsiteJsonLd } from "@/lib/seo"
import { formatPrice } from "@/lib/utils"

function FeaturedArtistCard({ artist }: { readonly artist: ArtistWithDetails }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="min-w-[200px] shrink-0 rounded-xl border border-stone-200 bg-white p-4 transition hover:shadow-md sm:min-w-0"
    >
      <div className="flex items-center gap-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-stone-100">
          {artist.avatar_url ? (
            <Image
              src={artist.avatar_url}
              alt={artist.display_name}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-bold text-stone-400">
              {artist.display_name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">{artist.display_name}</p>
          <p className="text-xs text-stone-500">{artist.city}</p>
        </div>
      </div>
      {artist.styles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {artist.styles.slice(0, 3).map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
            >
              {s.icon} {s.name}
            </span>
          ))}
        </div>
      )}
      {artist.price_min !== null && artist.price_min !== undefined && (
        <p className="mt-2 text-sm text-amber-600">
          {formatPrice(artist.price_min)} 起
        </p>
      )}
    </Link>
  )
}

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
                <FeaturedArtistCard key={artist.id} artist={artist} />
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
