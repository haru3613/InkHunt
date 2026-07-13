import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the /favorites page (HAR-468).
 *
 * The page is an async server component, so we mock its data layer
 * (`getCurrentUser` + `getFavoriteArtists`), the heavy/async `ArtistCard`
 * child, and `next-intl/server`, then `await` the default export to get the
 * rendered tree and assert the page WIRES the real favorites read path:
 * one card per saved artist, an empty state with a /artists CTA when the list
 * is empty, and a login prompt when logged out.
 */

const ARTIST_A = {
  id: 'artist-a',
  slug: 'artist-a',
  display_name: 'Artist A',
  city: '台北市',
}
const ARTIST_B = {
  id: 'artist-b',
  slug: 'artist-b',
  display_name: 'Artist B',
  city: '高雄市',
}

const { getCurrentUser, getFavoriteArtists } = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<unknown>>(),
  getFavoriteArtists: vi.fn<(lineUserId: string) => Promise<unknown[]>>(),
}))

vi.mock('@/lib/auth/helpers', () => ({
  getCurrentUser,
}))

vi.mock('@/lib/supabase/queries/favorites', () => ({
  getFavoriteArtists,
}))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

// ArtistCard is an async server component that renders deeply-nested async
// children; stub it to a sync marker echoing the artist + initialFavorited it
// received (HAR-667: /favorites must pass initialFavorited=true — these ARE
// the consumer's saved artists, so the heart must never render unfavorited).
vi.mock('@/components/artists/ArtistCard', () => ({
  ArtistCard: ({
    artist,
    initialFavorited,
  }: {
    artist: { id: string; display_name: string }
    initialFavorited?: boolean
  }) => (
    <div
      data-testid="artist-card"
      data-artist-id={artist.id}
      data-initial-favorited={String(initialFavorited ?? false)}
    >
      {artist.display_name}
    </div>
  ),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import FavoritesPage from '../page'

async function renderPage() {
  const ui = await FavoritesPage({
    params: Promise.resolve({ locale: 'zh-TW' }),
  })
  return render(ui)
}

describe('FavoritesPage — favorites read path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentUser.mockResolvedValue({ lineUserId: 'U_consumer' })
    getFavoriteArtists.mockResolvedValue([])
  })

  it('fetches favorites for the logged-in consumer by lineUserId', async () => {
    getFavoriteArtists.mockResolvedValue([ARTIST_A])
    await renderPage()
    expect(getFavoriteArtists).toHaveBeenCalledWith('U_consumer')
  })

  it('renders one ArtistCard per saved artist', async () => {
    getFavoriteArtists.mockResolvedValue([ARTIST_A, ARTIST_B])
    await renderPage()
    const cards = screen.getAllByTestId('artist-card')
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.getAttribute('data-artist-id'))).toEqual([
      'artist-a',
      'artist-b',
    ])
  })

  it('shows the empty state with a /artists CTA when there are no favorites', async () => {
    getFavoriteArtists.mockResolvedValue([])
    await renderPage()
    expect(screen.queryByTestId('artist-card')).not.toBeInTheDocument()
    expect(screen.getByText('還沒有收藏的刺青師')).toBeInTheDocument()
    const cta = screen.getByTestId('favorites-empty-cta')
    expect(cta).toHaveAttribute('href', '/artists')
  })

  it('does not call the data layer and prompts login when logged out', async () => {
    getCurrentUser.mockResolvedValue(null)
    await renderPage()
    expect(getFavoriteArtists).not.toHaveBeenCalled()
    expect(screen.getByTestId('favorites-login-prompt')).toBeInTheDocument()
  })

  it('login CTA points at the real LINE login entry, not the nonexistent /login (HAR-684)', async () => {
    getCurrentUser.mockResolvedValue(null)
    await renderPage()
    const cta = screen.getByRole('link', { name: '登入' })
    // Locale prefix preserved so the post-login redirect keeps the language
    expect(cta).toHaveAttribute(
      'href',
      '/api/auth/line?redirect=%2Fzh-TW%2Ffavorites',
    )
  })

  it('passes initialFavorited=true to every saved-artist card (HAR-667)', async () => {
    getFavoriteArtists.mockResolvedValue([ARTIST_A, ARTIST_B])
    await renderPage()
    for (const card of screen.getAllByTestId('artist-card')) {
      expect(card).toHaveAttribute('data-initial-favorited', 'true')
    }
  })
})
