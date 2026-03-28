import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSkeleton } from '../LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders with loading role for accessibility', () => {
    render(<LoadingSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders aria-label for screen readers', () => {
    render(<LoadingSkeleton />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('renders pulse animation elements', () => {
    render(<LoadingSkeleton />)
    const skeleton = screen.getByRole('status')
    expect(skeleton.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
