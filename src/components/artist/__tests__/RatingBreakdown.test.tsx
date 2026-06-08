import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RatingBreakdown } from '../RatingBreakdown'
import { computeReviewSummary, type RatingValue } from '@/lib/reviews'

// Derive a mixed distribution from the shared helper so the test stays in sync
// with the real `ReviewSummary`/`RatingValue` shape instead of hand-rolling it.
const MIXED = computeReviewSummary([
  { rating: 5 },
  { rating: 5 },
  { rating: 5 },
  { rating: 5 }, // 5★ × 4
  { rating: 4 },
  { rating: 4 }, // 4★ × 2
  { rating: 3 }, // 3★ × 1
  // 2★ × 0
  { rating: 1 },
  { rating: 1 },
  { rating: 1 }, // 1★ × 3
]).distribution
// → { 5: 4, 4: 2, 3: 1, 2: 0, 1: 3 }, total 10

const ZERO: Record<RatingValue, number> = computeReviewSummary([]).distribution
// → { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, total 0

/** Reads the inline width style (a percentage string) off a row's bar fill. */
function barWidth(row: HTMLElement): string {
  const fill = row.querySelector<HTMLElement>('[data-testid="rating-breakdown-bar-fill"]')
  expect(fill).not.toBeNull()
  return fill!.style.width
}

describe('RatingBreakdown', () => {
  it('renders exactly five rows, one per star bucket', () => {
    render(<RatingBreakdown distribution={MIXED} />)
    const rows = screen.getAllByTestId(/^rating-breakdown-row-/)
    expect(rows).toHaveLength(5)
  })

  it('orders rows descending 5★ → 1★ to match conventional rating panels', () => {
    render(<RatingBreakdown distribution={MIXED} />)
    const rows = screen.getAllByTestId(/^rating-breakdown-row-/)
    const order = rows.map((r) => r.getAttribute('data-bucket'))
    expect(order).toEqual(['5', '4', '3', '2', '1'])
  })

  it('shows the correct per-bucket count for a mixed distribution', () => {
    render(<RatingBreakdown distribution={MIXED} />)
    expect(
      within(screen.getByTestId('rating-breakdown-row-5')).getByText('4'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('rating-breakdown-row-4')).getByText('2'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('rating-breakdown-row-3')).getByText('1'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('rating-breakdown-row-2')).getByText('0'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('rating-breakdown-row-1')).getByText('3'),
    ).toBeInTheDocument()
  })

  it('sizes each bar proportionally to count / total', () => {
    render(<RatingBreakdown distribution={MIXED} />)
    // total = 10, so 5★ (4) → 40%, 4★ (2) → 20%, 3★ (1) → 10%,
    // 2★ (0) → 0%, 1★ (3) → 30%.
    expect(barWidth(screen.getByTestId('rating-breakdown-row-5'))).toBe('40%')
    expect(barWidth(screen.getByTestId('rating-breakdown-row-4'))).toBe('20%')
    expect(barWidth(screen.getByTestId('rating-breakdown-row-3'))).toBe('10%')
    expect(barWidth(screen.getByTestId('rating-breakdown-row-2'))).toBe('0%')
    expect(barWidth(screen.getByTestId('rating-breakdown-row-1'))).toBe('30%')
  })

  it('honours an explicit total prop over the summed distribution', () => {
    // total 20 (e.g. caller passes the full review count): 5★ (4) → 20%.
    render(<RatingBreakdown distribution={MIXED} total={20} />)
    expect(barWidth(screen.getByTestId('rating-breakdown-row-5'))).toBe('20%')
  })

  it('renders the zero-total state with all-zero counts and no NaN width', () => {
    render(<RatingBreakdown distribution={ZERO} />)
    const rows = screen.getAllByTestId(/^rating-breakdown-row-/)
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      // No division-by-zero artefact in the rendered width.
      const width = barWidth(row)
      expect(width).toBe('0%')
      expect(width).not.toContain('NaN')
      // Each row still shows a 0 count.
      expect(within(row).getByText('0')).toBeInTheDocument()
    }
  })

  it('exposes the count as text (not purely visual)', () => {
    // The bar conveys proportion visually; the count must be readable as text
    // so the information is not lost to non-sighted users.
    render(<RatingBreakdown distribution={MIXED} />)
    const row = screen.getByTestId('rating-breakdown-row-5')
    expect(within(row).getByText('4')).toBeInTheDocument()
  })
})
