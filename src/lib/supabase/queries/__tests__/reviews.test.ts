import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockClient),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { getReviewsByArtistId } from '../reviews'

// Distinct timestamps so the newest-first ordering claim is unambiguous.
const OLDEST = '2026-01-01T08:00:00.000Z'
const NEWEST = '2026-06-01T12:00:00.000Z'

/**
 * Build a thenable Supabase query chain that resolves to `result`. Mirrors the
 * pattern in `artists.test.ts`: every chainable method returns the same object
 * and `await`-ing the chain yields `result`.
 */
function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  return chain
}

describe('getReviewsByArtistId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects from `reviews` filtered by artist_id, ordered created_at desc', async () => {
    const chain = makeThenable({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await getReviewsByArtistId('artist-1')

    expect(mockFrom).toHaveBeenCalledWith('reviews')
    // filtered by the artist id
    expect(chain.eq).toHaveBeenCalledWith('artist_id', 'artist-1')
    // newest first
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('maps rows to the ReviewListItem shape (newest-first as returned by the query)', async () => {
    const rows = [
      {
        id: 'r2',
        artist_id: 'artist-1',
        author_line_user_id: 'U_b',
        rating: 5,
        comment: '非常滿意',
        created_at: NEWEST,
      },
      {
        id: 'r1',
        artist_id: 'artist-1',
        author_line_user_id: 'U_a',
        rating: 3,
        comment: null,
        created_at: OLDEST,
      },
    ]
    mockFrom.mockReturnValue(makeThenable({ data: rows, error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result).toHaveLength(2)
    // newest first, mapped to the presentational ReviewListItem shape
    expect(result[0]).toEqual({
      rating: 5,
      comment: '非常滿意',
      author_line_user_id: 'U_b',
      created_at: NEWEST,
    })
    expect(result[1]).toEqual({
      rating: 3,
      comment: null,
      author_line_user_id: 'U_a',
      created_at: OLDEST,
    })
    // does NOT leak DB-only columns into the presentational shape
    expect(result[0]).not.toHaveProperty('id')
    expect(result[0]).not.toHaveProperty('artist_id')
  })

  it('returns [] for an empty result set', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: [], error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result).toEqual([])
  })

  it('degrades to [] (without throwing) when the query errors', async () => {
    mockFrom.mockReturnValue(
      makeThenable({ data: null, error: { message: 'boom' } }),
    )

    await expect(getReviewsByArtistId('artist-1')).resolves.toEqual([])
  })

  it('returns [] when data is null without an error', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result).toEqual([])
  })

  it('returns [] (without throwing) when Supabase is not configured', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error('not configured')
    })

    await expect(getReviewsByArtistId('artist-1')).resolves.toEqual([])
  })
})
