import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ArtistReviewSummary } from '../ArtistReviewSummary'
import { computeReviewSummary, type ReviewSummary } from '@/lib/reviews'

// A populated summary derived from the shared helper so the test stays in sync
// with the real `ReviewSummary` shape rather than hand-rolling the type.
const POPULATED: ReviewSummary = computeReviewSummary([
  { rating: 5 },
  { rating: 5 },
  { rating: 4 },
  { rating: 4 },
  { rating: 3 },
  { rating: 1 },
])
// → average 3.7, count 6, distribution { 5:2, 4:2, 3:1, 2:0, 1:1 }

const EMPTY: ReviewSummary = computeReviewSummary([])

describe('ArtistReviewSummary', () => {
  it('renders the numeric average', () => {
    render(<ArtistReviewSummary summary={POPULATED} />)
    expect(screen.getByText('3.7')).toBeInTheDocument()
  })

  it('renders a read-only star control reflecting the average', () => {
    render(<ArtistReviewSummary summary={POPULATED} />)
    // StarRating read-only mode exposes the (rounded) rating via aria-label.
    // average 3.7 rounds to 4 stars.
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
    // Read-only => no interactive radios.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('renders the review count label', () => {
    render(<ArtistReviewSummary summary={POPULATED} />)
    expect(screen.getByText(/6 則評價/)).toBeInTheDocument()
  })

  it('renders a distribution row for every bucket 5 → 1 with its count', () => {
    render(<ArtistReviewSummary summary={POPULATED} />)
    const dist = screen.getByTestId('review-distribution')
    const rows = within(dist).getAllByTestId(/^review-distribution-row-/)
    // One row per star bucket, 5 down to 1.
    expect(rows).toHaveLength(5)

    // Rows are ordered 5 → 1.
    const order = rows.map((r) => r.getAttribute('data-bucket'))
    expect(order).toEqual(['5', '4', '3', '2', '1'])

    // Each row shows the bucket's count from the distribution.
    expect(
      within(screen.getByTestId('review-distribution-row-5')).getByText('2'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('review-distribution-row-3')).getByText('1'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('review-distribution-row-2')).getByText('0'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('review-distribution-row-1')).getByText('1'),
    ).toBeInTheDocument()
  })

  it('renders the empty-state placeholder when count is 0', () => {
    render(<ArtistReviewSummary summary={EMPTY} />)
    expect(screen.getByText('尚無評價')).toBeInTheDocument()
  })

  it('does not render the star control or distribution in the empty state', () => {
    render(<ArtistReviewSummary summary={EMPTY} />)
    expect(screen.queryByTestId('review-distribution')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
