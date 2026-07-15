import { describe, it, expect } from 'vitest'
import {
  parseDiscoveryQuery,
  discoveryHasActiveFilters,
} from '@/lib/discovery/parse'

describe('parseDiscoveryQuery', () => {
  it('defaults bare listing query', () => {
    const q = parseDiscoveryQuery({})
    expect(q).toMatchObject({
      style: null,
      city: null,
      page: 1,
      sort: 'featured',
      budget: 'any',
      service: null,
      q: null,
      minRating: null,
      healed: false,
      isNew: false,
    })
    expect(q.pageSize).toBeGreaterThan(0)
    expect(discoveryHasActiveFilters(q)).toBe(false)
  })

  it('maps style, city, page and facet params', () => {
    const q = parseDiscoveryQuery({
      style: 'fine-line',
      city: '台北市',
      page: '2',
      sort: 'newest',
      budget: 'le6000',
      service: 'coverup',
      q: ' wolf ',
      minRating: '4',
      healed: '1',
      new: '1',
    })
    expect(q.style).toBe('fine-line')
    expect(q.city).toBe('台北市')
    expect(q.page).toBe(2)
    expect(q.sort).toBe('newest')
    expect(q.budget).toBe('le6000')
    expect(q.service).toBe('coverup')
    expect(q.q).toBe('wolf')
    expect(q.minRating).toBe(4)
    expect(q.healed).toBe(true)
    expect(q.isNew).toBe(true)
    expect(discoveryHasActiveFilters(q)).toBe(true)
  })

  it('coerces garbage page to 1', () => {
    expect(parseDiscoveryQuery({ page: 'nope' }).page).toBe(1)
    expect(parseDiscoveryQuery({ page: '0' }).page).toBe(1)
  })
})
