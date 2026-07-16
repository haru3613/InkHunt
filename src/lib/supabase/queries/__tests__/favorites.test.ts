import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }
// Reconfigurable so the "missing admin client" degrade path can be exercised
// (a test makes it throw once, mirroring a missing service-role key in prod).
const mockCreateAdminClient = vi.fn(() => mockClient)

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

vi.mock('@/lib/observability', () => ({
  reportError: vi.fn(),
}))

import {
  addFavorite,
  removeFavorite,
  getFavoriteArtists,
  getFavoritedArtistIds,
  isFavorited,
} from '../favorites'

const CONSUMER = 'U1234567890'
const ARTIST_ID = '550e8400-e29b-41d4-a716-446655440000'

const BASE_ARTIST = {
  id: ARTIST_ID,
  slug: 'test-artist',
  display_name: 'Test',
  bio: null,
  avatar_url: null,
  ig_handle: null,
  city: '台北市',
  district: null,
  address: null,
  lat: null,
  lng: null,
  price_min: null,
  price_max: null,
  pricing_note: null,
  deposit_amount: null,
  booking_notice: null,
  status: 'active' as const,
  is_claimed: true,
  offers_coverup: false,
  offers_custom_design: false,
  has_flash_designs: false,
  featured: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

describe('addFavorite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('upserts the (consumer_line_id, artist_id) row idempotently', async () => {
    const chain = makeThenable({ error: null })
    mockFrom.mockReturnValue(chain)

    await addFavorite(CONSUMER, ARTIST_ID)

    expect(mockFrom).toHaveBeenCalledWith('favorites')
    // idempotent: upsert (or insert with ignoreDuplicates) on the PK
    expect(chain.upsert).toHaveBeenCalled()
    const [row] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(row).toMatchObject({ consumer_line_id: CONSUMER, artist_id: ARTIST_ID })
  })

  it('throws when the insert errors', async () => {
    mockFrom.mockReturnValue(makeThenable({ error: { message: 'boom' } }))
    await expect(addFavorite(CONSUMER, ARTIST_ID)).rejects.toThrow()
  })
})

describe('removeFavorite', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('deletes scoped to BOTH consumer_line_id AND artist_id', async () => {
    const chain = makeThenable({ error: null })
    mockFrom.mockReturnValue(chain)

    await removeFavorite(CONSUMER, ARTIST_ID)

    expect(mockFrom).toHaveBeenCalledWith('favorites')
    expect(chain.delete).toHaveBeenCalled()
    const eqMock = chain.eq as ReturnType<typeof vi.fn>
    expect(eqMock).toHaveBeenCalledWith('consumer_line_id', CONSUMER)
    expect(eqMock).toHaveBeenCalledWith('artist_id', ARTIST_ID)
    expect(eqMock).toHaveBeenCalledTimes(2)
  })

  it('throws when the delete errors', async () => {
    mockFrom.mockReturnValue(makeThenable({ error: { message: 'boom' } }))
    await expect(removeFavorite(CONSUMER, ARTIST_ID)).rejects.toThrow()
  })
})

describe('getFavoriteArtists', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns transformed artists for the consumer', async () => {
    const rows = [
      {
        artists: {
          ...BASE_ARTIST,
          artist_styles: [
            { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
          ],
          portfolio_items: [],
        },
      },
    ]
    const chain = makeThenable({ data: rows, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getFavoriteArtists(CONSUMER)

    expect(mockFrom).toHaveBeenCalledWith('favorites')
    const eqMock = chain.eq as ReturnType<typeof vi.fn>
    expect(eqMock).toHaveBeenCalledWith('consumer_line_id', CONSUMER)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(ARTIST_ID)
    expect(result[0].styles).toHaveLength(1)
    expect(result[0]).not.toHaveProperty('artist_styles')
  })

  it('returns empty array when consumer has no favorites', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: [], error: null }))
    const result = await getFavoriteArtists(CONSUMER)
    expect(result).toEqual([])
  })

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'fail' } }))
    const result = await getFavoriteArtists(CONSUMER)
    expect(result).toEqual([])
  })
})

describe('isFavorited', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns true when the row exists', async () => {
    const chain = makeThenable({ data: { artist_id: ARTIST_ID }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await isFavorited(CONSUMER, ARTIST_ID)

    expect(result).toBe(true)
    const eqMock = chain.eq as ReturnType<typeof vi.fn>
    expect(eqMock).toHaveBeenCalledWith('consumer_line_id', CONSUMER)
    expect(eqMock).toHaveBeenCalledWith('artist_id', ARTIST_ID)
  })

  it('returns false when the row does not exist', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))
    const result = await isFavorited(CONSUMER, ARTIST_ID)
    expect(result).toBe(false)
  })
})

describe('getFavoritedArtistIds', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns a Set of exactly the favorited ids among the passed ids (one bounded query, no N+1)', async () => {
    const chain = makeThenable({
      data: [{ artist_id: 'a1' }, { artist_id: 'a3' }],
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await getFavoritedArtistIds(CONSUMER, ['a1', 'a2', 'a3'])

    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('favorites')
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      'consumer_line_id',
      CONSUMER,
    )
    expect((chain.in as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      'artist_id',
      ['a1', 'a2', 'a3'],
    )
    expect(result).toBeInstanceOf(Set)
    expect([...result].sort()).toEqual(['a1', 'a3'])
  })

  it('short-circuits to an empty Set with NO query when artistIds is empty', async () => {
    const result = await getFavoritedArtistIds(CONSUMER, [])
    expect(result).toEqual(new Set())
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns an empty Set (never throws) on a query error', async () => {
    mockFrom.mockReturnValue(
      makeThenable({ data: null, error: { message: 'boom' } }),
    )
    const result = await getFavoritedArtistIds(CONSUMER, ['a1'])
    expect(result).toEqual(new Set())
  })

  it('returns an empty Set (never throws) when the admin client is missing', async () => {
    mockCreateAdminClient.mockImplementationOnce(() => {
      throw new Error('no admin client')
    })
    const result = await getFavoritedArtistIds(CONSUMER, ['a1'])
    expect(result).toEqual(new Set())
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
