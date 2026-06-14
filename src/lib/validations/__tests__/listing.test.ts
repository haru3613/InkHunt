import { describe, it, expect } from 'vitest'
import { parseListingSearchParams, listingSortSchema } from '../listing'

describe('listingSortSchema', () => {
  it('passes the four valid sort values through unchanged', () => {
    expect(listingSortSchema.parse('featured')).toBe('featured')
    expect(listingSortSchema.parse('price_low')).toBe('price_low')
    expect(listingSortSchema.parse('price_high')).toBe('price_high')
    expect(listingSortSchema.parse('newest')).toBe('newest')
  })

  it('coerces an unknown value to featured', () => {
    expect(listingSortSchema.parse('garbage')).toBe('featured')
    expect(listingSortSchema.parse('rating')).toBe('featured')
    expect(listingSortSchema.parse('PRICE_LOW')).toBe('featured')
  })

  it('coerces absent / non-string input to featured', () => {
    expect(listingSortSchema.parse(undefined)).toBe('featured')
    expect(listingSortSchema.parse(null)).toBe('featured')
    expect(listingSortSchema.parse(42)).toBe('featured')
    expect(listingSortSchema.parse([])).toBe('featured')
  })
})

describe('parseListingSearchParams', () => {
  it('extracts a valid sort value', () => {
    expect(parseListingSearchParams({ sort: 'price_low' })).toEqual({ sort: 'price_low' })
    expect(parseListingSearchParams({ sort: 'price_high' })).toEqual({ sort: 'price_high' })
    expect(parseListingSearchParams({ sort: 'newest' })).toEqual({ sort: 'newest' })
    expect(parseListingSearchParams({ sort: 'featured' })).toEqual({ sort: 'featured' })
  })

  it('defaults to featured when sort is absent', () => {
    expect(parseListingSearchParams({})).toEqual({ sort: 'featured' })
  })

  it('defaults to featured when sort is unknown', () => {
    expect(parseListingSearchParams({ sort: 'lolnope' })).toEqual({ sort: 'featured' })
  })

  it('ignores unrelated search params', () => {
    expect(parseListingSearchParams({ sort: 'newest', city: '台北市', page: '2' })).toEqual({
      sort: 'newest',
    })
  })
})
