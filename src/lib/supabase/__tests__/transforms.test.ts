import { describe, it, expect } from 'vitest'
import type { Style } from '@/types/database'
import { flattenArtistStyles } from '@/lib/supabase/transforms'

const makeStyle = (id: number, name: string): Style => ({
  id,
  slug: name.toLowerCase(),
  name,
  icon: null,
  name_en: null,
  description: null,
  subtitle: null,
  group_name: null,
  color_profile: null,
  popularity: 0,
  sort_order: id,
})

describe('flattenArtistStyles', () => {
  it('returns an array of styles extracted from artist_styles rows', () => {
    const fineLine = makeStyle(1, '極簡線條')
    const geometric = makeStyle(2, '幾何')
    const input = [
      { styles: fineLine },
      { styles: geometric },
    ]
    const result = flattenArtistStyles(input)
    expect(result).toEqual([fineLine, geometric])
  })

  it('returns an empty array for null input', () => {
    expect(flattenArtistStyles(null)).toEqual([])
  })

  it('returns an empty array for an empty array input', () => {
    expect(flattenArtistStyles([])).toEqual([])
  })

  it('returns an empty array for undefined input', () => {
    expect(flattenArtistStyles(undefined)).toEqual([])
  })
})
