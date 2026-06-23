import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getCurrentUser } from '@/lib/auth/helpers'
import { getFavoriteArtists } from '@/lib/supabase/queries/favorites'
import { ArtistCard } from '@/components/artists/ArtistCard'

interface FavoritesPageProps {
  readonly params: Promise<{ locale: string }>
}

/**
 * /favorites — the consumer's saved-artist "mood board" (HAR-468).
 *
 * Server component: reads the session, fetches the consumer's favorited
 * artists via `getFavoriteArtists(user.lineUserId)`, and renders one
 * `ArtistCard` per saved artist. Logged-out consumers get a login prompt;
 * logged-in consumers with no favorites get an empty state that funnels them
 * back to `/artists` to start collecting.
 */
export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="font-display mb-4 text-2xl font-bold text-foreground">
          我的收藏
        </h1>
        <div
          data-testid="favorites-login-prompt"
          className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-16 text-center"
        >
          <p className="text-muted-foreground">登入後即可查看你收藏的刺青師</p>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover"
          >
            登入
          </Link>
        </div>
      </div>
    )
  }

  const favorites = await getFavoriteArtists(user.lineUserId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display mb-4 text-2xl font-bold text-foreground">
        我的收藏
      </h1>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-16 text-center">
          <p className="text-muted-foreground">還沒有收藏的刺青師</p>
          <Link
            data-testid="favorites-empty-cta"
            href="/artists"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover"
          >
            探索刺青師
          </Link>
        </div>
      )}
    </div>
  )
}
