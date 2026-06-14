import { describe, it, expect } from 'vitest'
import { parseListingSearchParams, listingSortSchema, listingBudgetSchema } from '../listing'

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

describe('listingBudgetSchema (HAR-434)', () => {
  it('passes the five valid budget values through unchanged', () => {
    expect(listingBudgetSchema.parse('any')).toBe('any')
    expect(listingBudgetSchema.parse('le3000')).toBe('le3000')
    expect(listingBudgetSchema.parse('le6000')).toBe('le6000')
    expect(listingBudgetSchema.parse('le10000')).toBe('le10000')
    expect(listingBudgetSchema.parse('gt10000')).toBe('gt10000')
  })

  it('coerces an unknown value to any', () => {
    expect(listingBudgetSchema.parse('garbage')).toBe('any')
    expect(listingBudgetSchema.parse('le5000')).toBe('any')
    expect(listingBudgetSchema.parse('LE3000')).toBe('any')
  })

  it('coerces absent / non-string input to any', () => {
    expect(listingBudgetSchema.parse(undefined)).toBe('any')
    expect(listingBudgetSchema.parse(null)).toBe('any')
    expect(listingBudgetSchema.parse(42)).toBe('any')
    expect(listingBudgetSchema.parse([])).toBe('any')
  })
})

describe('parseListingSearchParams', () => {
  it('extracts a valid sort value', () => {
    expect(parseListingSearchParams({ sort: 'price_low' })).toMatchObject({ sort: 'price_low' })
    expect(parseListingSearchParams({ sort: 'price_high' })).toMatchObject({ sort: 'price_high' })
    expect(parseListingSearchParams({ sort: 'newest' })).toMatchObject({ sort: 'newest' })
    expect(parseListingSearchParams({ sort: 'featured' })).toMatchObject({ sort: 'featured' })
  })

  it('defaults to featured when sort is absent', () => {
    expect(parseListingSearchParams({})).toMatchObject({ sort: 'featured' })
  })

  it('defaults to featured when sort is unknown', () => {
    expect(parseListingSearchParams({ sort: 'lolnope' })).toMatchObject({ sort: 'featured' })
  })

  it('extracts a valid budget value (HAR-434)', () => {
    expect(parseListingSearchParams({ budget: 'le6000' })).toMatchObject({ budget: 'le6000' })
    expect(parseListingSearchParams({ budget: 'gt10000' })).toMatchObject({ budget: 'gt10000' })
  })

  it('defaults budget to any when absent or unknown (HAR-434)', () => {
    expect(parseListingSearchParams({})).toMatchObject({ budget: 'any' })
    expect(parseListingSearchParams({ budget: 'nope' })).toMatchObject({ budget: 'any' })
  })

  it('parses sort and budget together (HAR-434)', () => {
    expect(parseListingSearchParams({ sort: 'newest', budget: 'le3000' })).toEqual({
      sort: 'newest',
      budget: 'le3000',
    })
  })

  it('ignores unrelated search params', () => {
    expect(parseListingSearchParams({ sort: 'newest', city: '台北市', page: '2' })).toEqual({
      sort: 'newest',
      budget: 'any',
    })
  })
})
