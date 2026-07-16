import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getArtists, getFavoritedArtistIds } = vi.hoisted(() => ({
  getArtists: vi.fn(),
  getFavoritedArtistIds: vi.fn(),
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtists,
  DEFAULT_PAGE_SIZE: 12,
}))

vi.mock('@/lib/supabase/queries/favorites', () => ({
  getFavoritedArtistIds,
}))

import { listForViewer } from '@/lib/discovery/list'
import type { DiscoveryQuery } from '@/lib/discovery/types'

const baseQuery: DiscoveryQuery = {
  style: null,
  city: null,
  page: 1,
  pageSize: 12,
  sort: 'featured',
  budget: 'any',
  service: null,
  q: null,
  minRating: null,
  healed: false,
  isNew: false,
}

describe('listForViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns bag without favorites lookup when logged out', async () => {
    getArtists.mockResolvedValue({
      data: [{ id: 'a1' }, { id: 'a2' }],
      total: 2,
    })

    const result = await listForViewer(baseQuery, null)

    expect(getArtists).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sort: 'featured' }),
    )
    expect(getFavoritedArtistIds).not.toHaveBeenCalled()
    expect(result.total).toBe(2)
    expect(result.artists).toHaveLength(2)
    expect(result.favoritedIds.size).toBe(0)
    expect(result.hasActiveFilters).toBe(false)
  })

  it('decorates hearts for viewer', async () => {
    getArtists.mockResolvedValue({
      data: [{ id: 'a1' }, { id: 'a2' }],
      total: 2,
    })
    getFavoritedArtistIds.mockResolvedValue(new Set(['a2']))

    const result = await listForViewer(baseQuery, { lineUserId: 'U_viewer' })

    expect(getFavoritedArtistIds).toHaveBeenCalledWith('U_viewer', ['a1', 'a2'])
    expect(result.favoritedIds.has('a2')).toBe(true)
    expect(result.favoritedIds.has('a1')).toBe(false)
  })

  it('skips favorites when there are no artists', async () => {
    getArtists.mockResolvedValue({ data: [], total: 0 })
    const result = await listForViewer(
      { ...baseQuery, style: 'fine-line' },
      { lineUserId: 'U_viewer' },
    )
    expect(getFavoritedArtistIds).not.toHaveBeenCalled()
    expect(result.hasActiveFilters).toBe(true)
    expect(result.total).toBe(0)
  })
})
