import { describe, it, expect } from 'vitest'
import { computeReviewSummary } from '@/lib/reviews'

describe('computeReviewSummary', () => {
  it('returns a zeroed summary for an empty list', () => {
    expect(computeReviewSummary([])).toEqual({
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
  })

  it('summarizes a single review', () => {
    expect(computeReviewSummary([{ rating: 5 }])).toEqual({
      average: 5,
      count: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    })
  })

  it('averages multiple reviews and rounds to 1 decimal', () => {
    // (5 + 4 + 4) / 3 = 4.333... -> 4.3
    const summary = computeReviewSummary([
      { rating: 5 },
      { rating: 4 },
      { rating: 4 },
    ])
    expect(summary.average).toBe(4.3)
    expect(summary.count).toBe(3)
  })

  it('rounds half up to 1 decimal', () => {
    // (5 + 4) / 2 = 4.5 -> 4.5
    expect(computeReviewSummary([{ rating: 5 }, { rating: 4 }]).average).toBe(4.5)
    // (4 + 3 + 3) / 3 = 3.333... -> 3.3
    expect(
      computeReviewSummary([{ rating: 4 }, { rating: 3 }, { rating: 3 }]).average
    ).toBe(3.3)
    // (5 + 5 + 4) / 3 = 4.666... -> 4.7
    expect(
      computeReviewSummary([{ rating: 5 }, { rating: 5 }, { rating: 4 }]).average
    ).toBe(4.7)
  })

  it('builds the full distribution across all rating buckets', () => {
    const summary = computeReviewSummary([
      { rating: 1 },
      { rating: 2 },
      { rating: 2 },
      { rating: 3 },
      { rating: 4 },
      { rating: 5 },
      { rating: 5 },
      { rating: 5 },
    ])
    expect(summary.count).toBe(8)
    expect(summary.distribution).toEqual({ 1: 1, 2: 2, 3: 1, 4: 1, 5: 3 })
    // (1 + 2 + 2 + 3 + 4 + 5 + 5 + 5) / 8 = 3.375 -> 3.4
    expect(summary.average).toBe(3.4)
  })

  it('keeps a whole-number average as an integer-valued number', () => {
    // (4 + 4 + 4) / 3 = 4
    expect(computeReviewSummary([{ rating: 4 }, { rating: 4 }, { rating: 4 }]).average).toBe(4)
  })
})
