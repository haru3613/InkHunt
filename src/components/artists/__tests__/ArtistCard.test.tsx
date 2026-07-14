import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Consuming / vertical-slice test for the artists-listing card (HAR-417).
 *
 * `ArtistCard` is an async server component, so we mock its heavy/client-only
 * children + `next-intl/server`, then `await` the component to get the rendered
 * tree and assert it surfaces the review summary (StarRating + average + count)
 * on the listing surface. This is the consuming test the wired QA gate needs —
 * a data-layer test alone (artists.test.ts) does not exercise ArtistCard.tsx.
 */

vi.mock('next-intl/server', () => ({
  // Echo the key, but interpolate `{count}` so the saved-count badge's
  // `t('savedCount', { count })` produces an assertable string in tests.
  getTranslations: vi.fn(
    async () => (key: string, vars?: Record<string, unknown>) =>
      vars && 'count' in vars ? `${key}:${vars.count}` : key,
  ),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, never>)} />
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

// Compare button is a client component pulling in store state — stub it out.
vi.mock('../ArtistCompareAction', () => ({
  ArtistCompareAction: () => null,
}))

// PriceRange is itself an async server component; an unresolved async child
// renders to nothing under RTL's sync render, swallowing the whole card. Stub
// it so the real StarRating-bearing summary renders through.
vi.mock('../PriceRange', () => ({
  PriceRange: () => null,
}))

// FavoriteButton is a client component (useAuth/useState + fetch). Stub it to a
// sync element that surfaces the props it received via data-attrs, so the
// consuming test can assert the card mounts it with the right `artistId` /
// `initialFavorited` WITHOUT driving the real optimistic toggle (that flow is
// covered by FavoriteButton.test.tsx).
vi.mock('../FavoriteButton', () => ({
  FavoriteButton: ({
    artistId,
    initialFavorited,
  }: {
    artistId: string
    initialFavorited?: boolean
  }) => (
    <button
      data-testid="favorite-button"
      data-artist-id={artistId}
      data-initial-favorited={String(initialFavorited ?? false)}
    />
  ),
}))

import { ArtistCard } from '../ArtistCard'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'

const BASE: ArtistWithDetails = {
  id: 'a1',
  slug: 'test-artist',
  display_name: 'Test Artist',
  bio: null,
  avatar_url: null,
  ig_handle: null,
  city: '台北市',
  district: null,
  address: null,
  lat: null,
  lng: null,
  price_min: 3000,
  price_max: 10000,
  pricing_note: null,
  deposit_amount: null,
  booking_notice: null,
  status: 'active',
  is_claimed: true,
  offers_coverup: false,
  offers_custom_design: false,
  has_flash_designs: false,
  featured: false,
  quote_templates: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  styles: [],
  portfolio_items: [],
}

function withSummary(
  summary: { average: number; count: number } | undefined,
): ArtistWithDetails {
  return { ...BASE, reviewSummary: summary }
}

function withService(
  flags: Partial<
    Pick<ArtistWithDetails, 'offers_coverup' | 'has_flash_designs'>
  >,
): ArtistWithDetails {
  return { ...BASE, ...flags }
}

function withSavedCount(savedCount: number | undefined): ArtistWithDetails {
  return { ...BASE, savedCount }
}

function withCreatedAt(createdAt: string): ArtistWithDetails {
  return { ...BASE, created_at: createdAt }
}

/** One day ago — comfortably inside the 30-day new-artist window. */
const RECENT_CREATED_AT = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
/** Well outside the window (matches BASE's own stale fixture era). */
const OLD_CREATED_AT = '2020-01-01T00:00:00Z'

async function renderCard(
  artist: ArtistWithDetails,
  variant: 'default' | 'compact' = 'default',
  initialFavorited = false,
) {
  const ui = await ArtistCard({ artist, variant, initialFavorited })
  return render(ui)
}

describe('ArtistCard — review summary (HAR-417)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the StarRating + average (1 decimal) + (count) when a summary is present (default variant)', async () => {
    await renderCard(withSummary({ average: 4.6, count: 12 }))

    // numeric average to 1 decimal
    expect(screen.getByText('4.6')).toBeInTheDocument()
    // review count
    expect(screen.getByText(/\(12\)/)).toBeInTheDocument()
    // read-only StarRating exposes the rating via aria-label (4.6 -> 5 stars)
    expect(
      screen.getByLabelText('評分 5 分（滿分 5 分）'),
    ).toBeInTheDocument()
  })

  it('renders the summary in the compact variant too', async () => {
    await renderCard(withSummary({ average: 4.0, count: 3 }), 'compact')

    expect(screen.getByText('4.0')).toBeInTheDocument()
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument()
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
  })

  it('shows NO rating when count === 0 (clean card for unreviewed artists)', async () => {
    await renderCard(withSummary({ average: 0, count: 0 }))

    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /評分/ })).not.toBeInTheDocument()
  })

  it('shows NO rating when the summary is omitted entirely', async () => {
    await renderCard(withSummary(undefined))

    expect(screen.queryByRole('img', { name: /評分/ })).not.toBeInTheDocument()
  })
})

/**
 * Service-type badges (HAR-447): the card must surface the discriminating
 * service booleans it already receives — a 遮蓋 (cover-up) badge when
 * `offers_coverup` is true and a Flash 圖 badge when `has_flash_designs` is
 * true — so a consumer filtering by service sees on-card confirmation of why an
 * artist matched. `getTranslations` is mocked to echo the key, so we assert on
 * the i18n keys (`badgeCoverup` / `badgeFlash`).
 */
describe('ArtistCard — service-type badges (HAR-447)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the 遮蓋 badge when offers_coverup is true (default variant)', async () => {
    await renderCard(withService({ offers_coverup: true }))

    expect(screen.getByText('badgeCoverup')).toBeInTheDocument()
    expect(screen.queryByText('badgeFlash')).not.toBeInTheDocument()
  })

  it('shows the Flash 圖 badge when has_flash_designs is true (default variant)', async () => {
    await renderCard(withService({ has_flash_designs: true }))

    expect(screen.getByText('badgeFlash')).toBeInTheDocument()
    expect(screen.queryByText('badgeCoverup')).not.toBeInTheDocument()
  })

  it('shows both badges when both flags are true (default variant)', async () => {
    await renderCard(
      withService({ offers_coverup: true, has_flash_designs: true }),
    )

    expect(screen.getByText('badgeCoverup')).toBeInTheDocument()
    expect(screen.getByText('badgeFlash')).toBeInTheDocument()
  })

  it('shows NO service badge when both flags are false (default variant)', async () => {
    await renderCard(
      withService({ offers_coverup: false, has_flash_designs: false }),
    )

    expect(screen.queryByText('badgeCoverup')).not.toBeInTheDocument()
    expect(screen.queryByText('badgeFlash')).not.toBeInTheDocument()
  })

  it('shows the service badges in the compact variant too', async () => {
    await renderCard(
      withService({ offers_coverup: true, has_flash_designs: true }),
      'compact',
    )

    expect(screen.getByText('badgeCoverup')).toBeInTheDocument()
    expect(screen.getByText('badgeFlash')).toBeInTheDocument()
  })

  it('shows NO service badge in the compact variant when both flags are false', async () => {
    await renderCard(
      withService({ offers_coverup: false, has_flash_designs: false }),
      'compact',
    )

    expect(screen.queryByText('badgeCoverup')).not.toBeInTheDocument()
    expect(screen.queryByText('badgeFlash')).not.toBeInTheDocument()
  })
})

/**
 * Save-from-discovery (HAR-472): the listing card must mount a `FavoriteButton`
 * so a user can save an artist straight from the `/artists` grid. The button is
 * stubbed (above) to a sync element echoing its props; we assert the card both
 * renders it AND threads the artist's `id` through as `artistId`. Driving the
 * real optimistic POST/DELETE toggle is FavoriteButton.test.tsx's job — here we
 * only verify the consuming composition. Out of scope: reflecting the user's
 * actual saved state, so every card mounts with `initialFavorited={false}`.
 */
describe('ArtistCard — FavoriteButton (save from discovery, HAR-472)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts a FavoriteButton carrying the artist id as artistId (default variant)', async () => {
    await renderCard({ ...BASE, id: 'artist-xyz' })

    const fav = screen.getByTestId('favorite-button')
    expect(fav).toBeInTheDocument()
    expect(fav).toHaveAttribute('data-artist-id', 'artist-xyz')
  })

  it('mounts the FavoriteButton unfilled by default (initialFavorited=false)', async () => {
    await renderCard(BASE)

    expect(screen.getByTestId('favorite-button')).toHaveAttribute(
      'data-initial-favorited',
      'false',
    )
  })
})

/**
 * Reflect saved state on the discovery grid (HAR-594): the card now forwards an
 * optional `initialFavorited` prop to the FavoriteButton so a logged-in
 * consumer's already-saved artist renders a FILLED heart. The stub echoes the
 * prop via `data-initial-favorited`; the heart's `aria-pressed="true"` mapping
 * from `initialFavorited` is covered by FavoriteButton.test.tsx.
 */
describe('ArtistCard — reflects saved state (HAR-594)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('threads initialFavorited=true through to the FavoriteButton (filled heart)', async () => {
    await renderCard(BASE, 'default', true)

    expect(screen.getByTestId('favorite-button')).toHaveAttribute(
      'data-initial-favorited',
      'true',
    )
  })
})

/**
 * Threshold-gated saved-count badge (HAR-485): the card surfaces a calm
 * 「X 人收藏」/「X saved」social-proof badge, but ONLY when
 * `savedCount >= MIN_SAVED_COUNT` (3). Low counts are negative social proof, so
 * below threshold (and when the field is absent) the badge renders nothing —
 * mirroring `CardReviewSummary` hiding at `count === 0`. `getTranslations` is
 * mocked to echo `savedCount:{count}`, so we assert on that interpolated string.
 */
describe('ArtistCard — saved-count badge (HAR-485)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the saved-count badge when savedCount >= 3 (default variant)', async () => {
    await renderCard(withSavedCount(12))

    expect(screen.getByText('savedCount:12')).toBeInTheDocument()
  })

  it('renders the saved-count badge in the compact variant too', async () => {
    await renderCard(withSavedCount(12), 'compact')

    expect(screen.getByText('savedCount:12')).toBeInTheDocument()
  })

  it('renders the badge at exactly the threshold (savedCount === 3)', async () => {
    await renderCard(withSavedCount(3))

    expect(screen.getByText('savedCount:3')).toBeInTheDocument()
  })

  it('shows NO badge below threshold (savedCount === 2)', async () => {
    await renderCard(withSavedCount(2))

    expect(screen.queryByText(/savedCount/)).not.toBeInTheDocument()
  })

  it('shows NO badge when savedCount === 0', async () => {
    await renderCard(withSavedCount(0))

    expect(screen.queryByText(/savedCount/)).not.toBeInTheDocument()
  })

  it('shows NO badge when savedCount is absent', async () => {
    await renderCard(withSavedCount(undefined))

    expect(screen.queryByText(/savedCount/)).not.toBeInTheDocument()
  })

  it('shows NO badge below threshold in the compact variant', async () => {
    await renderCard(withSavedCount(2), 'compact')

    expect(screen.queryByText(/savedCount/)).not.toBeInTheDocument()
  })
})

/**
 * i18n parity (HAR-485): the `artists.savedCount` key must exist in BOTH locale
 * files so neither locale falls back to a missing-message error.
 */
describe('ArtistCard — savedCount i18n parity (HAR-485)', () => {
  it('defines artists.savedCount in both zh-TW and en', async () => {
    const [zh, en] = await Promise.all([
      import('../../../../messages/zh-TW.json'),
      import('../../../../messages/en.json'),
    ])

    expect(zh.default.artists.savedCount).toBeTruthy()
    expect(en.default.artists.savedCount).toBeTruthy()
    expect(zh.default.artists.savedCount).toContain('{count}')
    expect(en.default.artists.savedCount).toContain('{count}')
  })
})

/**
 * New-artist freshness badge (HAR-583): a freshly-approved artist has 0 reviews +
 * 0 saves, so the discovery card shows no positive signal. The card surfaces a
 * 「新加入」/「New」badge when `isNewArtist(created_at)` (30-day window), giving
 * cold-start supply a positive signal — in BOTH card variants. `getTranslations`
 * is mocked to echo the key, so we assert on `newBadge`.
 */
describe('ArtistCard — new-artist badge (HAR-583)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the new badge for a recently-created artist (default variant)', async () => {
    await renderCard(withCreatedAt(RECENT_CREATED_AT))

    expect(screen.getByText('newBadge')).toBeInTheDocument()
  })

  it('renders the new badge in the compact variant too', async () => {
    await renderCard(withCreatedAt(RECENT_CREATED_AT), 'compact')

    expect(screen.getByText('newBadge')).toBeInTheDocument()
  })

  it('shows NO badge for an artist older than the window (default variant)', async () => {
    await renderCard(withCreatedAt(OLD_CREATED_AT))

    expect(screen.queryByText('newBadge')).not.toBeInTheDocument()
  })

  it('shows NO badge for an old artist in the compact variant', async () => {
    await renderCard(withCreatedAt(OLD_CREATED_AT), 'compact')

    expect(screen.queryByText('newBadge')).not.toBeInTheDocument()
  })
})

/**
 * i18n parity (HAR-583): the `artists.newBadge` label must exist in BOTH locales
 * with the agreed copy so neither surface falls back to a missing-message error.
 */
describe('ArtistCard — newBadge i18n parity (HAR-583)', () => {
  it('defines artists.newBadge in both zh-TW and en', async () => {
    const [zh, en] = await Promise.all([
      import('../../../../messages/zh-TW.json'),
      import('../../../../messages/en.json'),
    ])

    expect(zh.default.artists.newBadge).toBe('新加入')
    expect(en.default.artists.newBadge).toBe('New')
  })
})
