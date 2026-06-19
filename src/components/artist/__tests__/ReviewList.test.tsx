import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewList, type ReviewListItem } from '../ReviewList'

// A few deterministic fixtures. created_at values are distinct so the sort
// assertions below are unambiguous.
const OLDEST = '2026-01-01T08:00:00.000Z'
const MIDDLE = '2026-03-14T09:30:00.000Z'
const NEWEST = '2026-06-01T12:00:00.000Z'

const THREE_REVIEWS: ReviewListItem[] = [
  { rating: 3, comment: '普通', created_at: MIDDLE },
  { rating: 5, comment: '非常滿意', author_line_user_id: 'U_a', created_at: NEWEST },
  { rating: 1, comment: '不推薦', created_at: OLDEST },
]

describe('ReviewList', () => {
  it('renders one ReviewCard per review', () => {
    render(<ReviewList reviews={THREE_REVIEWS} />)
    expect(screen.getAllByTestId('review-card')).toHaveLength(3)
  })

  it('renders each review comment', () => {
    render(<ReviewList reviews={THREE_REVIEWS} />)
    expect(screen.getByText('普通')).toBeInTheDocument()
    expect(screen.getByText('非常滿意')).toBeInTheDocument()
    expect(screen.getByText('不推薦')).toBeInTheDocument()
  })

  it('renders the empty-state message and zero cards when reviews is empty', () => {
    render(<ReviewList reviews={[]} />)
    expect(screen.queryAllByTestId('review-card')).toHaveLength(0)
    expect(screen.getByText('還沒有評價')).toBeInTheDocument()
  })

  it('does not render the empty-state message when there are reviews', () => {
    render(<ReviewList reviews={THREE_REVIEWS} />)
    expect(screen.queryByText('還沒有評價')).not.toBeInTheDocument()
  })

  it('defaults to newest-first ordering (most recent created_at first)', () => {
    render(<ReviewList reviews={THREE_REVIEWS} />)
    const comments = screen
      .getAllByTestId('review-card-comment')
      .map((el) => el.textContent)
    expect(comments).toEqual(['非常滿意', '普通', '不推薦'])
  })

  it('sorts by highest rating first when sort="highest" (independent of date order)', () => {
    // Rating order and date order deliberately DISAGREE here so this assertion
    // can only pass if the component sorts by `rating`, not by `created_at`.
    // The newest item has the lowest rating; the oldest has the highest.
    const ratingNeqDate: ReviewListItem[] = [
      { rating: 1, comment: '差', created_at: NEWEST },
      { rating: 5, comment: '優', created_at: OLDEST },
      { rating: 3, comment: '中', created_at: MIDDLE },
    ]
    render(<ReviewList reviews={ratingNeqDate} sort="highest" />)
    const comments = screen
      .getAllByTestId('review-card-comment')
      .map((el) => el.textContent)
    expect(comments).toEqual(['優', '中', '差'])
  })

  it('breaks rating ties by newest created_at first when sort="highest"', () => {
    // Two reviews share rating 5: the tie must resolve newest-first.
    const tied: ReviewListItem[] = [
      { rating: 5, comment: '五星-舊', created_at: OLDEST },
      { rating: 2, comment: '兩星', created_at: MIDDLE },
      { rating: 5, comment: '五星-新', created_at: NEWEST },
    ]
    render(<ReviewList reviews={tied} sort="highest" />)
    const comments = screen
      .getAllByTestId('review-card-comment')
      .map((el) => el.textContent)
    expect(comments).toEqual(['五星-新', '五星-舊', '兩星'])
  })

  it('does not mutate the input reviews array when sorting', () => {
    const input: ReviewListItem[] = [
      { rating: 1, comment: 'first', created_at: OLDEST },
      { rating: 5, comment: 'second', created_at: NEWEST },
    ]
    const snapshot = [...input]
    render(<ReviewList reviews={input} sort="highest" />)
    expect(input).toEqual(snapshot)
    expect(input[0].comment).toBe('first')
  })
})
