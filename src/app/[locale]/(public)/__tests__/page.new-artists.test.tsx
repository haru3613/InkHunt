import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the landing "新進刺青師" rail (HAR-584).
 *
 * HomePage is an async server component, so we mock its data layer
 * (`getFeaturedArtists` / `getNewArtists` / the styles queries), the heavy/async
 * children (`ArtistCard`, `StyleGrid`, `JsonLd`, `next/image`), and
 * `next-intl/server`, then `await` the default export to get the rendered tree.
 * We assert the new-artists rail WIRES `getNewArtists`: one card per returned
 * artist when populated, and NOTHING (empty-safe) when the list is empty.
 */

const NEW_A = { id: 'new-a', slug: 'new-a', display_name: 'New A' }
const NEW_B = { id: 'new-b', slug: 'new-b', display_name: 'New B' }

const {
  getFeaturedArtists,
  getNewArtists,
  getAllStyles,
  getAllArtistCounts,
  getStyleSampleImages,
} = vi.hoisted(() => ({
  getFeaturedArtists: vi.fn<() => Promise<unknown[]>>(),
  getNewArtists: vi.fn<(limit?: number) => Promise<unknown[]>>(),
  getAllStyles: vi.fn<() => Promise<unknown[]>>(),
  getAllArtistCounts: vi.fn<() => Promise<Record<string, number>>>(),
  getStyleSampleImages: vi.fn<() => Promise<Record<string, string>>>(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getFeaturedArtists,
  getNewArtists,
}))

vi.mock('@/lib/supabase/queries/styles', () => ({
  getAllStyles,
  getAllArtistCounts,
  getStyleSampleImages,
}))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('@/components/artists/ArtistCard', () => ({
  ArtistCard: ({ artist }: { artist: { id: string; display_name: string } }) => (
    <div data-testid="artist-card" data-artist-id={artist.id}>
      {artist.display_name}
    </div>
  ),
}))

vi.mock('@/components/artists/StyleGrid', () => ({ StyleGrid: () => null }))
vi.mock('@/components/home/ColdStartInvite', () => ({
  ColdStartInvite: () => <div data-testid="cold-start-invite">cold-start</div>,
}))
vi.mock('@/components/shared/JsonLd', () => ({ JsonLd: () => null }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/lib/seo', () => ({ generateWebsiteJsonLd: () => ({}) }))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import HomePage from '../page'

async function renderPage() {
  const ui = await HomePage({ params: Promise.resolve({ locale: 'zh-TW' }) })
  return render(ui)
}

describe('HomePage — 新進刺青師 rail (HAR-584)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFeaturedArtists.mockResolvedValue([])
    getNewArtists.mockResolvedValue([])
    getAllStyles.mockResolvedValue([])
    getAllArtistCounts.mockResolvedValue(new Map())
    getStyleSampleImages.mockResolvedValue(new Map())
  })

  it('requests up to 8 recently-active artists', async () => {
    await renderPage()
    expect(getNewArtists).toHaveBeenCalledWith(8)
  })

  it('renders one ArtistCard per new artist', async () => {
    getNewArtists.mockResolvedValue([NEW_A, NEW_B])
    await renderPage()

    const section = screen.getByTestId('new-artists-section')
    const cards = within(section).getAllByTestId('artist-card')
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.getAttribute('data-artist-id'))).toEqual([
      'new-a',
      'new-b',
    ])
    // Has supply rail → not pure cold-start invite
    expect(screen.queryByTestId('cold-start-invite')).not.toBeInTheDocument()
  })

  it('renders NOTHING when there are no new artists (empty-safe)', async () => {
    getNewArtists.mockResolvedValue([])
    await renderPage()
    expect(screen.queryByTestId('new-artists-section')).not.toBeInTheDocument()
  })

  it('shows cold-start invite when marketplace has no artists yet', async () => {
    getFeaturedArtists.mockResolvedValue([])
    getNewArtists.mockResolvedValue([])
    getAllArtistCounts.mockResolvedValue(new Map())
    await renderPage()
    expect(screen.getByTestId('cold-start-invite')).toBeInTheDocument()
  })
})
