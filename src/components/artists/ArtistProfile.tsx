import { MapPinIcon, CalendarIcon, BanknoteIcon, InfoIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { InquiryButton } from "@/components/inquiry/InquiryButton"
import { formatPrice, formatPriceRange, formatIgUrl } from "@/lib/utils"
import type { ArtistWithDetails } from "@/lib/supabase/queries/artists"
import { ArtistAvatar } from "./ArtistAvatar"

interface ArtistProfileProps {
  readonly artist: ArtistWithDetails
}

export async function ArtistProfile({ artist }: ArtistProfileProps) {
  const t = await getTranslations("artistProfile")
  const priceText = formatPriceRange(artist.price_min, artist.price_max)
  const igUrl = artist.ig_handle ? formatIgUrl(artist.ig_handle) : null
  const location = [artist.city, artist.district].filter(Boolean).join(" ")

  return (
    <section className="rounded-lg bg-card p-6">
      {/* Avatar + Name + IG */}
      <div className="flex items-start gap-4">
        <ArtistAvatar
          name={artist.display_name}
          avatarUrl={artist.avatar_url}
          size="lg"
          priority
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {artist.display_name}
          </h1>
          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-primary hover:text-ink-accent-hover"
            >
              {artist.ig_handle}
            </a>
          )}
        </div>
      </div>

      {/* Bio */}
      {artist.bio && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {artist.bio}
        </p>
      )}

      {/* Location */}
      {location && (
        <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-4" />
          <span>{location}</span>
        </div>
      )}

      {/* Style badges */}
      {artist.styles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {artist.styles.map((style) => (
            <Badge key={style.id} variant="secondary" className="text-xs">
              {style.icon && <span className="mr-0.5">{style.icon}</span>}
              {style.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Price / Deposit / Booking */}
      <div className="mt-4 space-y-2">
        {priceText && (
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <BanknoteIcon className="size-4 shrink-0 text-ink-text-muted" />
            <span className="font-medium">{priceText}</span>
          </div>
        )}
        {artist.pricing_note && (
          <p className="pl-6 text-xs text-muted-foreground">
            {artist.pricing_note}
          </p>
        )}
        {artist.deposit_amount !== null && artist.deposit_amount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <InfoIcon className="size-4 shrink-0 text-ink-text-muted" />
            <span>{t("deposit", { amount: formatPrice(artist.deposit_amount) })}</span>
          </div>
        )}
        {artist.booking_notice && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarIcon className="size-4 shrink-0 text-ink-text-muted" />
            <span>{artist.booking_notice}</span>
          </div>
        )}
      </div>

      {/* CTA - inline on desktop */}
      <div className="mt-6 hidden lg:block">
        <InquiryButton artistId={artist.id} artistName={artist.display_name} />
      </div>
    </section>
  )
}
