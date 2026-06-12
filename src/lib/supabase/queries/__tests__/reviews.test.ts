import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

import { getReviewsByArtistId } from '../reviews'

interface ReviewsThenable {
  result: { data: unknown; error: unknown }
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

/**
 * Build a chainable supabase stub that resolves (via `await`) to `result`.
 * Records the `.select`, `.eq`, `.order` calls so tests can assert the query
 * shape (table column list, `artist_id` filter, newest-first ordering).
 */
function makeThenable(result: { data: unknown; error: unknown }) {
  const chain = {
    result,
    then: (fn: (v: typeof result) => unknown) => Promise.resolve(fn(result)),
  } as unknown as ReviewsThenable & {
    then: (fn: (v: typeof result) => unknown) => Promise<unknown>
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  return chain
}

const ROW_A = {
  id: 'r1',
  artist_id: 'artist-1',
  author_line_user_id: 'U_author_1',
  rating: 5,
  comment: '很棒的刺青師',
  created_at: '2025-03-02T00:00:00Z',
}

const ROW_B = {
  id: 'r2',
  artist_id: 'artist-1',
  author_line_user_id: 'U_author_2',
  rating: 4,
  comment: null,
  created_at: '2025-03-01T00:00:00Z',
}

describe('getReviewsByArtistId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects from reviews filtered by artist_id, ordered newest-first', async () => {
    const chain = makeThenable({ data: [ROW_A, ROW_B], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getReviewsByArtistId('artist-1')

    expect(mockFrom).toHaveBeenCalledWith('reviews')
    expect(chain.eq).toHaveBeenCalledWith('artist_id', 'artist-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toHaveLength(2)
  })

  it('maps rows to the ReviewListItem shape the section consumes', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: [ROW_A], error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result[0]).toEqual({
      rating: 5,
      comment: '很棒的刺青師',
      author_line_user_id: 'U_author_1',
      created_at: '2025-03-02T00:00:00Z',
    })
  })

  it('preserves the DB ordering (newest first) in the mapped output', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: [ROW_A, ROW_B], error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result.map((r) => r.created_at)).toEqual([
      '2025-03-02T00:00:00Z',
      '2025-03-01T00:00:00Z',
    ])
  })

  it('returns [] when the artist has no reviews', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: [], error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result).toEqual([])
  })

  it('degrades to [] when the query errors, without throwing', async () => {
    mockFrom.mockReturnValue(
      makeThenable({ data: null, error: { message: 'boom' } }),
    )

    await expect(getReviewsByArtistId('artist-1')).resolves.toEqual([])
  })

  it('returns [] when data is null', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))

    const result = await getReviewsByArtistId('artist-1')

    expect(result).toEqual([])
  })
})
