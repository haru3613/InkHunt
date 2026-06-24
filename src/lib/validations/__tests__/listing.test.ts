import { describe, it, expect } from 'vitest'
import {
  parseListingSearchParams,
  listingSortSchema,
  listingBudgetSchema,
  parseArtistService,
  parseListingQuery,
  parseMinRating,
  hasActiveListingFilters,
} from '../listing'

describe('listingSortSchema', () => {
  it('passes the five valid sort values through unchanged', () => {
    expect(listingSortSchema.parse('featured')).toBe('featured')
    expect(listingSortSchema.parse('price_low')).toBe('price_low')
    expect(listingSortSchema.parse('price_high')).toBe('price_high')
    expect(listingSortSchema.parse('newest')).toBe('newest')
    // HAR-474: rating is now a valid sort value (評分最高).
    expect(listingSortSchema.parse('rating')).toBe('rating')
  })

  it('coerces an unknown value to featured', () => {
    expect(listingSortSchema.parse('garbage')).toBe('featured')
    expect(listingSortSchema.parse('PRICE_LOW')).toBe('featured')
    expect(listingSortSchema.parse('RATING')).toBe('featured')
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
      service: null,
      q: null,
      minRating: null,
    })
  })

  it('ignores unrelated search params', () => {
    expect(parseListingSearchParams({ sort: 'newest', city: '台北市', page: '2' })).toEqual({
      sort: 'newest',
      budget: 'any',
      service: null,
      q: null,
      minRating: null,
    })
  })
})

describe('hasActiveListingFilters (HAR-435)', () => {
  it('is false when every filter is at its default', () => {
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })

  it('treats absent (undefined) style/city as no filter', () => {
    expect(
      hasActiveListingFilters({ style: undefined, city: undefined, sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })

  it('treats empty-string style/city as no filter', () => {
    expect(
      hasActiveListingFilters({ style: '', city: '', sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })

  it('is true when a style is selected', () => {
    expect(
      hasActiveListingFilters({ style: 'traditional', city: null, sort: 'featured', budget: 'any' }),
    ).toBe(true)
  })

  it('is true when a city is selected', () => {
    expect(
      hasActiveListingFilters({ style: null, city: '台北市', sort: 'featured', budget: 'any' }),
    ).toBe(true)
  })

  it('is true when sort is not the featured default', () => {
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'newest', budget: 'any' }),
    ).toBe(true)
  })

  it('is true when budget is not the any default', () => {
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'featured', budget: 'le3000' }),
    ).toBe(true)
  })

  it('is true when only the service filter is set (HAR-446)', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: 'coverup',
      }),
    ).toBe(true)
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: 'flash',
      }),
    ).toBe(true)
  })

  it('is false when service is null/absent and everything else is default (HAR-446)', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
      }),
    ).toBe(false)
    // service omitted entirely is also no filter
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })
})

describe('parseArtistService (HAR-446)', () => {
  it('maps the two valid service values to themselves', () => {
    expect(parseArtistService('coverup')).toBe('coverup')
    expect(parseArtistService('flash')).toBe('flash')
  })

  it('returns null for unknown string values', () => {
    expect(parseArtistService('garbage')).toBeNull()
    expect(parseArtistService('custom')).toBeNull()
    expect(parseArtistService('COVERUP')).toBeNull()
    expect(parseArtistService('')).toBeNull()
  })

  it('returns null for absent / non-string input', () => {
    expect(parseArtistService(undefined)).toBeNull()
    expect(parseArtistService(null)).toBeNull()
    expect(parseArtistService(42)).toBeNull()
    expect(parseArtistService([])).toBeNull()
    expect(parseArtistService(['coverup'])).toBeNull()
  })
})

describe('parseListingSearchParams — service (HAR-446)', () => {
  it('extracts a valid service value', () => {
    expect(parseListingSearchParams({ service: 'coverup' })).toMatchObject({ service: 'coverup' })
    expect(parseListingSearchParams({ service: 'flash' })).toMatchObject({ service: 'flash' })
  })

  it('defaults service to null when absent or unknown', () => {
    expect(parseListingSearchParams({})).toMatchObject({ service: null })
    expect(parseListingSearchParams({ service: 'nope' })).toMatchObject({ service: null })
  })

  it('parses sort, budget and service together', () => {
    expect(
      parseListingSearchParams({ sort: 'newest', budget: 'le3000', service: 'flash' }),
    ).toEqual({
      sort: 'newest',
      budget: 'le3000',
      service: 'flash',
      q: null,
      minRating: null,
    })
  })
})

describe('parseListingQuery (HAR-455)', () => {
  it('returns null for absent / non-string input', () => {
    expect(parseListingQuery(undefined)).toBeNull()
    expect(parseListingQuery(null)).toBeNull()
    expect(parseListingQuery(42)).toBeNull()
    expect(parseListingQuery([])).toBeNull()
    expect(parseListingQuery(['bob'])).toBeNull()
  })

  it('returns null for an empty or whitespace-only string', () => {
    expect(parseListingQuery('')).toBeNull()
    expect(parseListingQuery('   ')).toBeNull()
    expect(parseListingQuery('\t\n')).toBeNull()
  })

  it('trims surrounding whitespace and returns the normalized string', () => {
    expect(parseListingQuery('  bob ')).toBe('bob')
    expect(parseListingQuery('ink')).toBe('ink')
  })

  it('caps an over-long input at 100 chars (post-trim)', () => {
    const longInput = 'a'.repeat(250)
    const result = parseListingQuery(longInput)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(100)
    expect(result).toBe('a'.repeat(100))
  })

  it('trims before capping so leading/trailing spaces do not consume the budget', () => {
    const result = parseListingQuery(`  ${'a'.repeat(250)}  `)
    expect(result).toHaveLength(100)
  })
})

describe('parseListingSearchParams — q (HAR-455)', () => {
  it('extracts a valid q value', () => {
    expect(parseListingSearchParams({ q: 'ink' })).toMatchObject({ q: 'ink' })
  })

  it('trims the q value', () => {
    expect(parseListingSearchParams({ q: '  bob ' })).toMatchObject({ q: 'bob' })
  })

  it('defaults q to null when absent, empty or whitespace-only', () => {
    expect(parseListingSearchParams({})).toMatchObject({ q: null })
    expect(parseListingSearchParams({ q: '' })).toMatchObject({ q: null })
    expect(parseListingSearchParams({ q: '   ' })).toMatchObject({ q: null })
  })

  it('parses q alongside sort, budget and service', () => {
    expect(
      parseListingSearchParams({ sort: 'newest', budget: 'le3000', service: 'flash', q: 'bob' }),
    ).toEqual({
      sort: 'newest',
      budget: 'le3000',
      service: 'flash',
      q: 'bob',
      minRating: null,
    })
  })
})

describe('hasActiveListingFilters — q (HAR-455)', () => {
  it('is true when only q is set', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: 'bob',
      }),
    ).toBe(true)
  })

  it('is false when q is null/absent and everything else is default', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: null,
      }),
    ).toBe(false)
    // q omitted entirely is also no filter
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })

  it('treats an empty / whitespace-only q as no filter', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: '',
      }),
    ).toBe(false)
  })
})

describe('listingSortSchema — rating (HAR-474)', () => {
  it('maps ?sort=rating to rating', () => {
    expect(listingSortSchema.parse('rating')).toBe('rating')
  })

  it('still maps the existing sort values and falls back to featured on invalid', () => {
    expect(listingSortSchema.parse('featured')).toBe('featured')
    expect(listingSortSchema.parse('price_low')).toBe('price_low')
    expect(listingSortSchema.parse('price_high')).toBe('price_high')
    expect(listingSortSchema.parse('newest')).toBe('newest')
    expect(listingSortSchema.parse('garbage')).toBe('featured')
    expect(listingSortSchema.parse(undefined)).toBe('featured')
  })
})

describe('parseMinRating (HAR-474)', () => {
  it('returns 4 for the numeric and string forms of 4', () => {
    expect(parseMinRating(4)).toBe(4)
    expect(parseMinRating('4')).toBe(4)
  })

  it('returns 4.5 for the numeric and string forms of 4.5', () => {
    expect(parseMinRating(4.5)).toBe(4.5)
    expect(parseMinRating('4.5')).toBe(4.5)
  })

  it('returns null for absent input', () => {
    expect(parseMinRating(undefined)).toBeNull()
    expect(parseMinRating(null)).toBeNull()
    expect(parseMinRating('')).toBeNull()
  })

  it('returns null for out-of-allowlist values', () => {
    expect(parseMinRating('3')).toBeNull()
    expect(parseMinRating('5')).toBeNull()
    expect(parseMinRating(3)).toBeNull()
    expect(parseMinRating(5)).toBeNull()
    expect(parseMinRating(4.2)).toBeNull()
    expect(parseMinRating('4.2')).toBeNull()
    expect(parseMinRating(0)).toBeNull()
    expect(parseMinRating(-4)).toBeNull()
    expect(parseMinRating('-4')).toBeNull()
  })

  it('returns null for non-numeric / wrong-typed input', () => {
    expect(parseMinRating('abc')).toBeNull()
    expect(parseMinRating(NaN)).toBeNull()
    expect(parseMinRating(Infinity)).toBeNull()
    expect(parseMinRating([])).toBeNull()
    expect(parseMinRating(['4'])).toBeNull()
    expect(parseMinRating({})).toBeNull()
    expect(parseMinRating(true)).toBeNull()
  })

  it('does not coerce surrounding whitespace into a valid value', () => {
    expect(parseMinRating(' 4 ')).toBeNull()
    expect(parseMinRating('4 ')).toBeNull()
  })
})

describe('parseListingSearchParams — minRating (HAR-474)', () => {
  it('extracts a valid minRating value', () => {
    expect(parseListingSearchParams({ minRating: '4' })).toMatchObject({ minRating: 4 })
    expect(parseListingSearchParams({ minRating: '4.5' })).toMatchObject({ minRating: 4.5 })
  })

  it('defaults minRating to null when absent or invalid', () => {
    expect(parseListingSearchParams({})).toMatchObject({ minRating: null })
    expect(parseListingSearchParams({ minRating: '3' })).toMatchObject({ minRating: null })
    expect(parseListingSearchParams({ minRating: 'nope' })).toMatchObject({ minRating: null })
  })

  it('parses minRating alongside sort, budget, service and q', () => {
    expect(
      parseListingSearchParams({
        sort: 'rating',
        budget: 'le3000',
        service: 'flash',
        q: 'bob',
        minRating: '4.5',
      }),
    ).toEqual({
      sort: 'rating',
      budget: 'le3000',
      service: 'flash',
      q: 'bob',
      minRating: 4.5,
    })
  })
})

describe('hasActiveListingFilters — minRating + rating sort (HAR-474)', () => {
  it('is true when only minRating is set', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: null,
        minRating: 4,
      }),
    ).toBe(true)
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: null,
        minRating: 4.5,
      }),
    ).toBe(true)
  })

  it('is true when only the rating sort is set (non-default sort)', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'rating',
        budget: 'any',
        service: null,
        q: null,
        minRating: null,
      }),
    ).toBe(true)
  })

  it('is false when minRating is null and everything else is default', () => {
    expect(
      hasActiveListingFilters({
        style: null,
        city: null,
        sort: 'featured',
        budget: 'any',
        service: null,
        q: null,
        minRating: null,
      }),
    ).toBe(false)
    // minRating omitted entirely is also no filter
    expect(
      hasActiveListingFilters({ style: null, city: null, sort: 'featured', budget: 'any' }),
    ).toBe(false)
  })
})
