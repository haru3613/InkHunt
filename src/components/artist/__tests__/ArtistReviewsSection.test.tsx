import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ArtistReviewsSection } from '../ArtistReviewsSection'
import { computeReviewSummary, type ReviewSummary } from '@/lib/reviews'
import type { ReviewListItem } from '../ReviewList'

// Distinct timestamps so any ordering inside ReviewList is unambiguous.
const OLDEST = '2026-01-01T08:00:00.000Z'
const MIDDLE = '2026-03-14T09:30:00.000Z'
const NEWEST = '2026-06-01T12:00:00.000Z'

const THREE_REVIEWS: ReviewListItem[] = [
  { rating: 3, comment: '普通', created_at: MIDDLE },
  { rating: 5, comment: '非常滿意', author_line_user_id: 'U_a', created_at: NEWEST },
  { rating: 1, comment: '不推薦', created_at: OLDEST },
]

// Summary derived from the shared helper so the fixture stays in sync with the
// real `ReviewSummary` shape rather than hand-rolling it.
const POPULATED: ReviewSummary = computeReviewSummary(THREE_REVIEWS)
// → average 3.0, count 3, distribution { 5:1, 4:0, 3:1, 2:0, 1:1 }

const EMPTY_SUMMARY: ReviewSummary = computeReviewSummary([])

describe('ArtistReviewsSection', () => {
  describe('with a populated summary and reviews', () => {
    it('renders the section heading', () => {
      render(<ArtistReviewsSection summary={POPULATED} reviews={THREE_REVIEWS} />)
      expect(screen.getByRole('heading', { name: '顧客評價' })).toBeInTheDocument()
    })

    it('renders the summary (average + count)', () => {
      render(<ArtistReviewsSection summary={POPULATED} reviews={THREE_REVIEWS} />)
      const summary = screen.getByTestId('review-summary')
      // average 3.0 of THREE_REVIEWS renders as "3".
      expect(within(summary).getByText('3')).toBeInTheDocument()
      expect(within(summary).getByText(/3 則評價/)).toBeInTheDocument()
    })

    it('renders the standalone RatingBreakdown with all five buckets', () => {
      render(<ArtistReviewsSection summary={POPULATED} reviews={THREE_REVIEWS} />)
      const breakdown = screen.getByTestId('rating-breakdown')
      const rows = within(breakdown).getAllByTestId(/^rating-breakdown-row-/)
      expect(rows).toHaveLength(5)
      // counts mirror the distribution: 5★→1, 3★→1, 1★→1, others 0
      expect(
        within(screen.getByTestId('rating-breakdown-row-5')).getByText('1'),
      ).toBeInTheDocument()
      expect(
        within(screen.getByTestId('rating-breakdown-row-4')).getByText('0'),
      ).toBeInTheDocument()
    })

    it('renders one review card per review', () => {
      render(<ArtistReviewsSection summary={POPULATED} reviews={THREE_REVIEWS} />)
      expect(screen.getAllByTestId('review-card')).toHaveLength(3)
      expect(screen.getByText('非常滿意')).toBeInTheDocument()
      expect(screen.getByText('普通')).toBeInTheDocument()
      expect(screen.getByText('不推薦')).toBeInTheDocument()
    })

    it('does not show the review-list empty state when there are reviews', () => {
      render(<ArtistReviewsSection summary={POPULATED} reviews={THREE_REVIEWS} />)
      expect(screen.queryByTestId('review-list-empty')).not.toBeInTheDocument()
    })
  })

  describe('empty state (count === 0, reviews=[])', () => {
    it('still renders the heading', () => {
      render(<ArtistReviewsSection summary={EMPTY_SUMMARY} reviews={[]} />)
      expect(screen.getByRole('heading', { name: '顧客評價' })).toBeInTheDocument()
    })

    it('renders zero review cards and the empty-state message', () => {
      render(<ArtistReviewsSection summary={EMPTY_SUMMARY} reviews={[]} />)
      expect(screen.queryAllByTestId('review-card')).toHaveLength(0)
      expect(screen.getByTestId('review-list-empty')).toBeInTheDocument()
    })

    it('renders an all-zero RatingBreakdown without NaN', () => {
      const { container } = render(
        <ArtistReviewsSection summary={EMPTY_SUMMARY} reviews={[]} />,
      )
      const breakdown = screen.getByTestId('rating-breakdown')
      expect(
        within(breakdown).getAllByTestId(/^rating-breakdown-row-/),
      ).toHaveLength(5)
      // No NaN anywhere in the rendered output.
      expect(container.innerHTML).not.toContain('NaN')
    })

    it('does not crash or render NaN for the summary block', () => {
      const { container } = render(
        <ArtistReviewsSection summary={EMPTY_SUMMARY} reviews={[]} />,
      )
      expect(container.innerHTML).not.toContain('NaN')
    })
  })
})
