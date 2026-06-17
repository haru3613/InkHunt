import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => mockClient),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { transformArtistRow, getArtistBySlug, getFeaturedArtists, getArtists, getAllArtistSlugs } from '../artists'

const BASE_ARTIST = {
  id: 'a1',
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
  quote_templates: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

function makeThenable<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.limit = vi.fn().mockResolvedValue(result)
  return chain
}

describe('transformArtistRow', () => {
  it('flattens artist_styles into styles array and sorts portfolio', () => {
    const row = {
      ...BASE_ARTIST,
      price_min: 3000,
      price_max: 10000,
      offers_custom_design: true,
      artist_styles: [
        { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
        { styles: { id: 2, slug: 'micro', name: '微刺青', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 2 } },
      ],
      portfolio_items: [
        { id: 'p2', artist_id: 'a1', image_url: '/2.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
        { id: 'p1', artist_id: 'a1', image_url: '/1.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
      ],
    }

    const result = transformArtistRow(row)

    expect(result.styles).toHaveLength(2)
    expect(result.styles[0].slug).toBe('fine-line')
    expect(result.portfolio_items[0].sort_order).toBe(1)
    expect(result.portfolio_items[1].sort_order).toBe(2)
    expect(result).not.toHaveProperty('artist_styles')
    expect(result).not.toHaveProperty('admin_note')
    expect(result).not.toHaveProperty('line_user_id')
  })

  it('does not mutate original array', () => {
    const items = [
      { id: 'p2', artist_id: 'a1', image_url: '/2.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 2, created_at: '2025-01-01T00:00:00Z' },
      { id: 'p1', artist_id: 'a1', image_url: '/1.jpg', thumbnail_url: null, title: null, description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 1, created_at: '2025-01-01T00:00:00Z' },
    ]
    const row = { ...BASE_ARTIST, artist_styles: [], portfolio_items: items }

    transformArtistRow(row)

    expect(items[0].sort_order).toBe(2)
  })

  it('filters null styles from artist_styles', () => {
    const row = {
      ...BASE_ARTIST,
      artist_styles: [
        { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
        { styles: null },
      ],
      portfolio_items: [],
    }

    const result = transformArtistRow(row as Parameters<typeof transformArtistRow>[0])

    expect(result.styles).toHaveLength(1)
  })

  it('handles empty artist_styles', () => {
    const row = { ...BASE_ARTIST, artist_styles: [], portfolio_items: [] }
    const result = transformArtistRow(row)
    expect(result.styles).toEqual([])
    expect(result.portfolio_items).toEqual([])
  })
})

describe('getArtistBySlug', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns transformed artist when found', async () => {
    const raw = {
      ...BASE_ARTIST,
      slug: 'test-artist',
      price_min: 3000,
      price_max: 10000,
      featured: true,
      artist_styles: [
        { styles: { id: 1, slug: 'fine-line', name: '極簡線條', icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 5, sort_order: 1 } },
      ],
      portfolio_items: [],
    }

    mockFrom.mockReturnValue(makeThenable({ data: raw, error: null }))

    const result = await getArtistBySlug('test-artist')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('test-artist')
    expect(result?.styles).toHaveLength(1)
  })

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { code: 'PGRST116' } }))

    const result = await getArtistBySlug('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null when Supabase not configured', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => { throw new Error('not configured') })

    const result = await getArtistBySlug('test-artist')

    expect(result).toBeNull()
  })
})

describe('getFeaturedArtists', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns transformed featured artists', async () => {
    const raw = [{ ...BASE_ARTIST, slug: 'featured-1', featured: true, artist_styles: [], portfolio_items: [] }]

    mockFrom.mockReturnValue(makeThenable({ data: raw, error: null }))

    const result = await getFeaturedArtists(3)

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('featured-1')
  })

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'fail' } }))

    const result = await getFeaturedArtists()

    expect(result).toEqual([])
  })

  it('returns [] when Supabase not configured', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => { throw new Error('not configured') })

    const result = await getFeaturedArtists()

    expect(result).toEqual([])
  })
})

describe('getArtists', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns paginated artists without filters', async () => {
    const raw = [{ ...BASE_ARTIST, slug: 'artist-1', artist_styles: [], portfolio_items: [] }]

    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) return makeThenable({ count: 1, error: null })
      return makeThenable({ data: raw, error: null })
    })

    const result = await getArtists({ page: 1, pageSize: 12 })

    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].slug).toBe('artist-1')
  })

  it('returns empty result when no artists match style filter', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'styles') {
        return makeThenable({ data: { id: 99 }, error: null })
      }
      if (table === 'artist_styles') {
        // .select().eq().eq() — two chained eqs
        return makeThenable({ data: [], error: null })
      }
      return { select: vi.fn() }
    })

    const result = await getArtists({ style: 'nonexistent-style' })

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })

  it('filters by city', async () => {
    const raw = [{ ...BASE_ARTIST, slug: 'taipei-artist', city: '台北市', artist_styles: [], portfolio_items: [] }]

    let callNum = 0
    mockFrom.mockImplementation(() => {
      callNum++
      if (callNum === 1) return makeThenable({ count: 1, error: null })
      return makeThenable({ data: raw, error: null })
    })

    const result = await getArtists({ city: '台北市' })

    expect(result.total).toBe(1)
    expect(result.data[0].city).toBe('台北市')
  })

  it('returns { data: [], total: 0 } when Supabase not configured', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => { throw new Error('not configured') })

    const result = await getArtists({ page: 1, pageSize: 12 })

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })

  describe('sort ordering (HAR-433)', () => {
    /**
     * Wire `getArtists`' three `from()` calls (no style filter) and return the
     * data-query chain so the test can assert the `.order(...)` calls it issued.
     *   1. count query   -> { count }
     *   2. data query    -> { data: artistRows }  (the chain we return)
     *   3. reviews query -> { data: [] }
     */
    function wireDataQuery() {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
      ]
      const dataChain = makeThenable({ data: artistRows, error: null })
      let callNum = 0
      mockFrom.mockImplementation(() => {
        callNum++
        if (callNum === 1) return makeThenable({ count: 1, error: null })
        if (callNum === 2) return dataChain
        return makeThenable({ data: [], error: null })
      })
      return dataChain
    }

    it('defaults to featured + updated_at ordering when sort is absent', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ page: 1, pageSize: 12 })

      expect(dataChain.order).toHaveBeenCalledWith('featured', { ascending: false })
      expect(dataChain.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    })

    it('uses featured + updated_at ordering for an explicit featured sort', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ page: 1, pageSize: 12, sort: 'featured' })

      expect(dataChain.order).toHaveBeenCalledWith('featured', { ascending: false })
      expect(dataChain.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    })

    it('orders by price_min ascending for price_low', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ page: 1, pageSize: 12, sort: 'price_low' })

      expect(dataChain.order).toHaveBeenCalledWith('price_min', { ascending: true, nullsFirst: false })
      expect(dataChain.order).not.toHaveBeenCalledWith('featured', { ascending: false })
    })

    it('orders by price_max descending for price_high', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ page: 1, pageSize: 12, sort: 'price_high' })

      expect(dataChain.order).toHaveBeenCalledWith('price_max', { ascending: false, nullsFirst: false })
      expect(dataChain.order).not.toHaveBeenCalledWith('featured', { ascending: false })
    })

    it('orders by created_at descending for newest', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ page: 1, pageSize: 12, sort: 'newest' })

      expect(dataChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(dataChain.order).not.toHaveBeenCalledWith('featured', { ascending: false })
    })

    it('composes the price_low sort with the city filter and pagination', async () => {
      const dataChain = wireDataQuery()

      await getArtists({ city: '台北市', page: 2, pageSize: 12, sort: 'price_low' })

      expect(dataChain.order).toHaveBeenCalledWith('price_min', { ascending: true, nullsFirst: false })
      expect(dataChain.eq).toHaveBeenCalledWith('city', '台北市')
      // page 2, pageSize 12 -> range(12, 23)
      expect(dataChain.range).toHaveBeenCalledWith(12, 23)
    })
  })

  describe('budget price filter (HAR-434)', () => {
    /**
     * Wire `getArtists`' three `from()` calls (no style filter) and return BOTH
     * the count-query chain (1st `from()`) and the data-query chain (2nd) so the
     * test can assert the `.lte/.gte('price_min', …)` predicate landed on each —
     * the count query must carry the same predicate or `total` drifts.
     *   1. count query   -> { count }      (countChain)
     *   2. data query    -> { data: rows } (dataChain)
     *   3. reviews query -> { data: [] }
     */
    function wireCountAndData() {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
      ]
      const countChain = makeThenable({ count: 1, error: null })
      const dataChain = makeThenable({ data: artistRows, error: null })
      let callNum = 0
      mockFrom.mockImplementation(() => {
        callNum++
        if (callNum === 1) return countChain
        if (callNum === 2) return dataChain
        return makeThenable({ data: [], error: null })
      })
      return { countChain, dataChain }
    }

    const LTE_CASES: Array<['le3000' | 'le6000' | 'le10000', number]> = [
      ['le3000', 3000],
      ['le6000', 6000],
      ['le10000', 10000],
    ]

    for (const [budget, threshold] of LTE_CASES) {
      it(`applies .lte('price_min', ${threshold}) to BOTH queries for ${budget}`, async () => {
        const { countChain, dataChain } = wireCountAndData()

        await getArtists({ page: 1, pageSize: 12, budget })

        expect(dataChain.lte).toHaveBeenCalledWith('price_min', threshold)
        expect(countChain.lte).toHaveBeenCalledWith('price_min', threshold)
        expect(dataChain.gte).not.toHaveBeenCalled()
        expect(countChain.gte).not.toHaveBeenCalled()
      })
    }

    it("applies .gte('price_min', 10000) to BOTH queries for gt10000", async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, budget: 'gt10000' })

      expect(dataChain.gte).toHaveBeenCalledWith('price_min', 10000)
      expect(countChain.gte).toHaveBeenCalledWith('price_min', 10000)
      expect(dataChain.lte).not.toHaveBeenCalled()
      expect(countChain.lte).not.toHaveBeenCalled()
    })

    it('applies NO price predicate for budget=any', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, budget: 'any' })

      expect(dataChain.lte).not.toHaveBeenCalled()
      expect(dataChain.gte).not.toHaveBeenCalled()
      expect(countChain.lte).not.toHaveBeenCalled()
      expect(countChain.gte).not.toHaveBeenCalled()
    })

    it('applies NO price predicate when budget is absent', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12 })

      expect(dataChain.lte).not.toHaveBeenCalled()
      expect(dataChain.gte).not.toHaveBeenCalled()
      expect(countChain.lte).not.toHaveBeenCalled()
      expect(countChain.gte).not.toHaveBeenCalled()
    })

    it('composes budget with concurrent city + sort filters on the data query', async () => {
      const { dataChain } = wireCountAndData()

      await getArtists({ city: '台北市', page: 1, pageSize: 12, sort: 'price_low', budget: 'le6000' })

      // budget predicate
      expect(dataChain.lte).toHaveBeenCalledWith('price_min', 6000)
      // city filter still applied
      expect(dataChain.eq).toHaveBeenCalledWith('city', '台北市')
      // sort ordering from the prior slice still applied
      expect(dataChain.order).toHaveBeenCalledWith('price_min', { ascending: true, nullsFirst: false })
    })
  })

  describe('service-offering filter (HAR-446)', () => {
    /**
     * Wire the (no style filter) call sequence and return BOTH the count chain
     * (1st `from()`) and the data chain (2nd) so the test can assert the
     * `.eq('offers_coverup'|'has_flash_designs', true)` boolean predicate landed
     * on each — the count query must carry the same predicate or `total` drifts.
     *   1. count query   -> { count }      (countChain)
     *   2. data query    -> { data: rows } (dataChain)
     *   3. reviews query -> { data: [] }
     */
    function wireCountAndData() {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
      ]
      const countChain = makeThenable({ count: 1, error: null })
      const dataChain = makeThenable({ data: artistRows, error: null })
      let callNum = 0
      mockFrom.mockImplementation(() => {
        callNum++
        if (callNum === 1) return countChain
        if (callNum === 2) return dataChain
        return makeThenable({ data: [], error: null })
      })
      return { countChain, dataChain }
    }

    it("applies .eq('offers_coverup', true) to BOTH queries for service=coverup", async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, service: 'coverup' })

      expect(dataChain.eq).toHaveBeenCalledWith('offers_coverup', true)
      expect(countChain.eq).toHaveBeenCalledWith('offers_coverup', true)
      expect(dataChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
    })

    it("applies .eq('has_flash_designs', true) to BOTH queries for service=flash", async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, service: 'flash' })

      expect(dataChain.eq).toHaveBeenCalledWith('has_flash_designs', true)
      expect(countChain.eq).toHaveBeenCalledWith('has_flash_designs', true)
      expect(dataChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
    })

    it('applies NO service predicate when service is null', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, service: null })

      expect(dataChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
      expect(dataChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
    })

    it('applies NO service predicate when service is absent', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12 })

      expect(dataChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
      expect(dataChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('offers_coverup', true)
      expect(countChain.eq).not.toHaveBeenCalledWith('has_flash_designs', true)
    })

    it('returns { data: [], total: 0 } sparse-safe when no artist matches (count=0)', async () => {
      // count query resolves to 0 → getArtists short-circuits before the data query
      let callNum = 0
      mockFrom.mockImplementation(() => {
        callNum++
        if (callNum === 1) return makeThenable({ count: 0, error: null })
        return makeThenable({ data: [], error: null })
      })

      const result = await getArtists({ page: 1, pageSize: 12, service: 'coverup' })

      expect(result).toEqual({ data: [], total: 0 })
    })

    it('composes the service predicate with concurrent city + budget + sort filters', async () => {
      const { dataChain } = wireCountAndData()

      await getArtists({
        city: '台北市',
        page: 1,
        pageSize: 12,
        sort: 'price_low',
        budget: 'le6000',
        service: 'coverup',
      })

      // service predicate
      expect(dataChain.eq).toHaveBeenCalledWith('offers_coverup', true)
      // city filter still applied
      expect(dataChain.eq).toHaveBeenCalledWith('city', '台北市')
      // budget predicate still applied
      expect(dataChain.lte).toHaveBeenCalledWith('price_min', 6000)
      // sort ordering still applied
      expect(dataChain.order).toHaveBeenCalledWith('price_min', { ascending: true, nullsFirst: false })
    })
  })

  describe('keyword search filter (HAR-455)', () => {
    /**
     * Wire the (no style filter) call sequence and return BOTH the count chain
     * (1st `from()`) and the data chain (2nd) so the test can assert the
     * `.or('display_name.ilike.%term%,bio.ilike.%term%')` predicate landed on
     * each — the count query must carry the SAME predicate or `total` drifts.
     *   1. count query   -> { count }      (countChain)
     *   2. data query    -> { data: rows } (dataChain)
     *   3. reviews query -> { data: [] }
     */
    function wireCountAndData() {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
      ]
      const countChain = makeThenable({ count: 1, error: null })
      const dataChain = makeThenable({ data: artistRows, error: null })
      let callNum = 0
      mockFrom.mockImplementation(() => {
        callNum++
        if (callNum === 1) return countChain
        if (callNum === 2) return dataChain
        return makeThenable({ data: [], error: null })
      })
      return { countChain, dataChain }
    }

    it('applies the name/bio ilike .or(...) predicate to BOTH queries for q=bob', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, q: 'bob' })

      const expected = 'display_name.ilike.%bob%,bio.ilike.%bob%'
      expect(dataChain.or).toHaveBeenCalledWith(expected)
      expect(countChain.or).toHaveBeenCalledWith(expected)
    })

    it('applies NO .or predicate when q is null', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, q: null })

      expect(dataChain.or).not.toHaveBeenCalled()
      expect(countChain.or).not.toHaveBeenCalled()
    })

    it('applies NO .or predicate when q is absent ({})', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({})

      expect(dataChain.or).not.toHaveBeenCalled()
      expect(countChain.or).not.toHaveBeenCalled()
    })

    it('applies NO .or predicate when q is empty / whitespace-only', async () => {
      const { countChain, dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, q: '   ' })

      expect(dataChain.or).not.toHaveBeenCalled()
      expect(countChain.or).not.toHaveBeenCalled()
    })

    it('escapes %, _ and , in the term before reaching .or (both queries)', async () => {
      const { countChain, dataChain } = wireCountAndData()

      // a term with every PostgREST-dangerous char: comma (or-delimiter),
      // % and _ (LIKE wildcards)
      await getArtists({ page: 1, pageSize: 12, q: 'a%b_c,d' })

      const expected =
        'display_name.ilike.%a\\%b\\_c\\,d%,bio.ilike.%a\\%b\\_c\\,d%'
      expect(dataChain.or).toHaveBeenCalledWith(expected)
      expect(countChain.or).toHaveBeenCalledWith(expected)

      // the raw, unescaped comma must NOT survive into the filter string —
      // otherwise PostgREST splits it into extra OR branches
      const dataArg = (dataChain.or as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(dataArg).not.toMatch(/[^\\],d/)
    })

    it('trims the term before building the predicate', async () => {
      const { dataChain } = wireCountAndData()

      await getArtists({ page: 1, pageSize: 12, q: '  bob  ' })

      expect(dataChain.or).toHaveBeenCalledWith('display_name.ilike.%bob%,bio.ilike.%bob%')
    })

    it('composes the q predicate with concurrent city + budget + sort + service filters', async () => {
      const { dataChain } = wireCountAndData()

      await getArtists({
        city: '台北市',
        page: 1,
        pageSize: 12,
        sort: 'price_low',
        budget: 'le6000',
        service: 'coverup',
        q: 'bob',
      })

      // keyword predicate
      expect(dataChain.or).toHaveBeenCalledWith('display_name.ilike.%bob%,bio.ilike.%bob%')
      // other facets still applied
      expect(dataChain.eq).toHaveBeenCalledWith('city', '台北市')
      expect(dataChain.eq).toHaveBeenCalledWith('offers_coverup', true)
      expect(dataChain.lte).toHaveBeenCalledWith('price_min', 6000)
      expect(dataChain.order).toHaveBeenCalledWith('price_min', { ascending: true, nullsFirst: false })
    })
  })

  describe('review summary (HAR-417)', () => {
    /**
     * Wire the three `from()` calls `getArtists` makes (no filters):
     *   1. count query   -> { count }
     *   2. data query    -> { data: artistRows }
     *   3. reviews query -> { data: reviewRows }  (the new HAR-417 call)
     * Returns the spy chain used for the reviews call so the test can assert
     * the single `.in('artist_id', ids)` select.
     */
    function wireGetArtists(artistRows: unknown[], reviewRows: unknown[], reviewsError: unknown = null) {
      const reviewsChain = makeThenable({ data: reviewRows, error: reviewsError })
      let callNum = 0
      mockFrom.mockImplementation((table: string) => {
        callNum++
        if (callNum === 1) return makeThenable({ count: artistRows.length, error: null })
        if (callNum === 2) return makeThenable({ data: artistRows, error: null })
        // 3rd call must be the reviews aggregation query
        expect(table).toBe('reviews')
        return reviewsChain
      })
      return reviewsChain
    }

    it('fetches ratings for the page artist ids in ONE reviews query (no N+1)', async () => {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
        { ...BASE_ARTIST, id: 'a2', slug: 'artist-2', artist_styles: [], portfolio_items: [] },
      ]
      const reviewRows = [
        { artist_id: 'a1', rating: 5 },
        { artist_id: 'a1', rating: 4 },
        { artist_id: 'a2', rating: 3 },
      ]
      const reviewsChain = wireGetArtists(artistRows, reviewRows)

      await getArtists({ page: 1, pageSize: 12 })

      // exactly one reviews fetch, filtered to the page's ids
      expect(reviewsChain.in).toHaveBeenCalledTimes(1)
      expect(reviewsChain.in).toHaveBeenCalledWith('artist_id', ['a1', 'a2'])
    })

    it('maps { average, count } per artist', async () => {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
        { ...BASE_ARTIST, id: 'a2', slug: 'artist-2', artist_styles: [], portfolio_items: [] },
      ]
      const reviewRows = [
        { artist_id: 'a1', rating: 5 },
        { artist_id: 'a1', rating: 4 },
        { artist_id: 'a1', rating: 4 },
        { artist_id: 'a2', rating: 3 },
      ]
      wireGetArtists(artistRows, reviewRows)

      const { data } = await getArtists({ page: 1, pageSize: 12 })

      const a1 = data.find((a) => a.id === 'a1')
      const a2 = data.find((a) => a.id === 'a2')
      // a1: (5+4+4)/3 = 4.333 -> 4.3
      expect(a1?.reviewSummary).toEqual({ average: 4.3, count: 3 })
      expect(a2?.reviewSummary).toEqual({ average: 3, count: 1 })
    })

    it('leaves count 0 (or omits summary) for an artist with no reviews', async () => {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
        { ...BASE_ARTIST, id: 'a2', slug: 'artist-2', artist_styles: [], portfolio_items: [] },
      ]
      const reviewRows = [{ artist_id: 'a1', rating: 5 }]
      wireGetArtists(artistRows, reviewRows)

      const { data } = await getArtists({ page: 1, pageSize: 12 })

      const a2 = data.find((a) => a.id === 'a2')
      // unreviewed artist: either no summary, or a summary whose count is 0
      expect(a2?.reviewSummary?.count ?? 0).toBe(0)
    })

    it('degrades gracefully when the reviews query errors (cards still render, no throw)', async () => {
      const artistRows = [
        { ...BASE_ARTIST, id: 'a1', slug: 'artist-1', artist_styles: [], portfolio_items: [] },
      ]
      wireGetArtists(artistRows, [], { message: 'reviews fetch failed' })

      const result = await getArtists({ page: 1, pageSize: 12 })

      // artists still returned despite the review-fetch failure
      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].slug).toBe('artist-1')
      // no rating attached on the failure path
      expect(result.data[0].reviewSummary?.count ?? 0).toBe(0)
    })
  })
})

describe('getAllArtistSlugs', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns slugs with updated_at for active artists', async () => {
    const slugData = [
      { slug: 'artist-one', updated_at: '2025-01-01T00:00:00Z' },
      { slug: 'artist-two', updated_at: '2025-02-01T00:00:00Z' },
    ]

    mockFrom.mockReturnValue(makeThenable({ data: slugData, error: null }))

    const result = await getAllArtistSlugs()

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('artist-one')
    expect(result[0].updated_at).toBe('2025-01-01T00:00:00Z')
    expect(result[1].slug).toBe('artist-two')
  })

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: { message: 'query failed' } }))

    const result = await getAllArtistSlugs()

    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeThenable({ data: null, error: null }))

    const result = await getAllArtistSlugs()

    expect(result).toEqual([])
  })

  it('returns [] when Supabase not configured', async () => {
    vi.mocked(createAdminClient).mockImplementationOnce(() => { throw new Error('not configured') })

    const result = await getAllArtistSlugs()

    expect(result).toEqual([])
  })
})
