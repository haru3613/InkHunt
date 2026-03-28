import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

function chainQuery(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data, error })
  // For select with count/head options, resolve directly from select
  if (error !== null || data !== undefined) {
    ;(chain.select as ReturnType<typeof vi.fn>).mockReturnValue({
      ...chain,
      then: (fn: (v: { data: unknown; error: unknown; count?: number }) => void) =>
        Promise.resolve(fn({ data, error })),
    })
  }
  return chain
}

function chainQueryList(data: unknown[], error: unknown = null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockResolvedValue({ data, error })
  return chain
}

import { getAllStyles, getStyleBySlug, getAllArtistCounts } from '../styles'

describe('getAllStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns styles ordered by sort_order', async () => {
    const styles = [
      { id: 1, slug: 'fine-line', name: '極簡線條', sort_order: 1 },
      { id: 2, slug: 'micro', name: '微刺青', sort_order: 2 },
    ]

    const chain = chainQueryList(styles)
    mockFrom.mockReturnValue(chain)

    const result = await getAllStyles()

    expect(mockFrom).toHaveBeenCalledWith('styles')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    expect(result).toEqual(styles)
  })

  it('returns empty array on error', async () => {
    const chain = chainQueryList([], { message: 'connection failed' })
    // Override order to return error
    chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection failed' } })
    mockFrom.mockReturnValue(chain)

    const result = await getAllStyles()

    expect(result).toEqual([])
  })
})

describe('getStyleBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns style when found', async () => {
    const style = { id: 1, slug: 'fine-line', name: '極簡線條' }
    const chain = chainQuery(style)
    mockFrom.mockReturnValue(chain)

    const result = await getStyleBySlug('fine-line')

    expect(chain.eq).toHaveBeenCalledWith('slug', 'fine-line')
    expect(result).toEqual(style)
  })

  it('returns null when not found', async () => {
    const chain = chainQuery(null, { code: 'PGRST116' })
    mockFrom.mockReturnValue(chain)

    const result = await getStyleBySlug('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getAllArtistCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct counts per style slug', async () => {
    const callIndex = { value: 0 }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'artist_styles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { style_id: 1, artists: { status: 'active' } },
                { style_id: 1, artists: { status: 'active' } },
                { style_id: 2, artists: { status: 'active' } },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'styles') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 1, slug: 'fine-line' },
              { id: 2, slug: 'micro' },
              { id: 3, slug: 'realism' },
            ],
            error: null,
          }),
        }
      }
      callIndex.value++
      return { select: vi.fn() }
    })

    const result = await getAllArtistCounts()

    expect(result.get('fine-line')).toBe(2)
    expect(result.get('micro')).toBe(1)
    expect(result.get('realism')).toBe(0)
  })

  it('returns empty map on artist_styles error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'failed' },
        }),
      }),
    })

    const result = await getAllArtistCounts()

    expect(result.size).toBe(0)
  })
})
