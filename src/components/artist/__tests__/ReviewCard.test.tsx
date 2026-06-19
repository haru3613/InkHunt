import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewCard } from '../ReviewCard'

// A fixed ISO timestamp so the formatted-date assertion is deterministic.
const CREATED_AT = '2026-03-14T09:30:00.000Z'
// zh-TW locale date for the timestamp above (date-only, timezone-stable assertion
// is derived at runtime to avoid CI-timezone flakiness).
const EXPECTED_DATE = new Date(CREATED_AT).toLocaleDateString('zh-TW')

describe('ReviewCard', () => {
  it('renders the read-only star rating for the review', () => {
    render(<ReviewCard review={{ rating: 4, created_at: CREATED_AT }} />)
    // StarRating read-only mode exposes the rating via aria-label.
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
    // Read-only => no interactive radios.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('renders the comment text when present', () => {
    render(
      <ReviewCard
        review={{
          rating: 5,
          comment: '非常專業，作品很滿意！',
          created_at: CREATED_AT,
        }}
      />,
    )
    expect(screen.getByText('非常專業，作品很滿意！')).toBeInTheDocument()
  })

  it('renders an author label when author_line_user_id is present', () => {
    render(
      <ReviewCard
        review={{
          rating: 5,
          author_line_user_id: 'U_abc123',
          created_at: CREATED_AT,
        }}
      />,
    )
    expect(screen.getByTestId('review-card-author')).toBeInTheDocument()
  })

  it('renders the formatted created_at date', () => {
    render(<ReviewCard review={{ rating: 3, created_at: CREATED_AT }} />)
    expect(screen.getByText(EXPECTED_DATE)).toBeInTheDocument()
  })

  it('renders a full review: stars, comment, author, and date together', () => {
    render(
      <ReviewCard
        review={{
          rating: 5,
          comment: '回應快速，環境乾淨。',
          author_line_user_id: 'U_xyz789',
          created_at: CREATED_AT,
        }}
      />,
    )
    expect(
      screen.getByLabelText('評分 5 分（滿分 5 分）'),
    ).toBeInTheDocument()
    expect(screen.getByText('回應快速，環境乾淨。')).toBeInTheDocument()
    expect(screen.getByTestId('review-card-author')).toBeInTheDocument()
    expect(screen.getByText(EXPECTED_DATE)).toBeInTheDocument()
  })

  it('omits the comment block when comment is null (no crash)', () => {
    render(
      <ReviewCard review={{ rating: 4, comment: null, created_at: CREATED_AT }} />,
    )
    expect(screen.queryByTestId('review-card-comment')).not.toBeInTheDocument()
    // The rest of the card still renders.
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
  })

  it('omits the comment block when comment is an empty/whitespace string', () => {
    render(
      <ReviewCard review={{ rating: 4, comment: '   ', created_at: CREATED_AT }} />,
    )
    expect(screen.queryByTestId('review-card-comment')).not.toBeInTheDocument()
  })

  it('omits the author label when author_line_user_id is null (no crash)', () => {
    render(
      <ReviewCard
        review={{ rating: 4, author_line_user_id: null, created_at: CREATED_AT }}
      />,
    )
    expect(screen.queryByTestId('review-card-author')).not.toBeInTheDocument()
    // The card still renders the rating + date.
    expect(
      screen.getByLabelText('評分 4 分（滿分 5 分）'),
    ).toBeInTheDocument()
    expect(screen.getByText(EXPECTED_DATE)).toBeInTheDocument()
  })

  it('renders cleanly with only the required fields (rating + created_at)', () => {
    render(<ReviewCard review={{ rating: 2, created_at: CREATED_AT }} />)
    expect(
      screen.getByLabelText('評分 2 分（滿分 5 分）'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('review-card-comment')).not.toBeInTheDocument()
    expect(screen.queryByTestId('review-card-author')).not.toBeInTheDocument()
  })
})
