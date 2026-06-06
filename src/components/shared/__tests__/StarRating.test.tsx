import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from '../StarRating'

describe('StarRating', () => {
  it('renders five stars', () => {
    render(<StarRating value={3} />)
    const stars = screen.getAllByTestId(/^star-/)
    expect(stars).toHaveLength(5)
  })

  it('reflects the value by marking the correct number of stars as filled', () => {
    render(<StarRating value={3} />)
    const filled = screen
      .getAllByTestId(/^star-/)
      .filter((el) => el.getAttribute('data-filled') === 'true')
    expect(filled).toHaveLength(3)
  })

  it('marks zero stars filled for a value of 0', () => {
    render(<StarRating value={0} />)
    const filled = screen
      .getAllByTestId(/^star-/)
      .filter((el) => el.getAttribute('data-filled') === 'true')
    expect(filled).toHaveLength(0)
  })

  it('renders as a radiogroup when interactive', () => {
    render(<StarRating value={2} onChange={() => {}} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('invokes onChange with the clicked star number (1-indexed)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '4 顆星' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('exposes an accessible name on every star', () => {
    render(<StarRating value={0} onChange={() => {}} />)
    for (let n = 1; n <= 5; n++) {
      expect(screen.getByRole('radio', { name: `${n} 顆星` })).toBeInTheDocument()
    }
  })

  it('marks the radio matching the current value as checked', () => {
    render(<StarRating value={3} onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: '3 顆星' })).toBeChecked()
  })

  it('is keyboard operable: focused star fires onChange on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)

    const star = screen.getByRole('radio', { name: '2 顆星' })
    star.focus()
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('is read-only when no onChange is provided: no buttons, no radiogroup', () => {
    render(<StarRating value={4} />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is read-only when readOnly is true even if onChange is provided', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={4} onChange={onChange} readOnly />)

    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    // Display container exposes the rating via aria-label.
    expect(screen.getByLabelText('評分 4 分（滿分 5 分）')).toBeInTheDocument()

    // Clicking the rendered stars must not trigger onChange.
    const stars = screen.getAllByTestId(/^star-/)
    await user.click(stars[0])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('exposes the rating via aria-label in read-only display mode', () => {
    render(<StarRating value={5} />)
    expect(screen.getByLabelText('評分 5 分（滿分 5 分）')).toBeInTheDocument()
  })

  it('applies a custom pixel size to the stars', () => {
    render(<StarRating value={1} size={32} />)
    const star = screen.getAllByTestId(/^star-/)[0]
    expect(star).toHaveAttribute('width', '32')
    expect(star).toHaveAttribute('height', '32')
  })
})
