import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { StyleCard } from '../StyleCard'

const defaultProps = {
  name: '極簡線條',
  nameEn: 'Fine Line',
  group: 'popular' as const,
  selected: false,
  onToggle: vi.fn(),
}

describe('StyleCard', () => {
  it('renders the style name and English name', () => {
    render(<StyleCard {...defaultProps} />)
    expect(screen.getByText('極簡線條')).toBeInTheDocument()
    expect(screen.getByText('Fine Line')).toBeInTheDocument()
  })

  it('shows the checkmark when selected is true', () => {
    render(<StyleCard {...defaultProps} selected={true} />)
    // The checkmark is rendered as ✓ (HTML entity &#10003;)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('does not show the checkmark when selected is false', () => {
    render(<StyleCard {...defaultProps} selected={false} />)
    expect(screen.queryByText('✓')).not.toBeInTheDocument()
  })

  it('sets aria-pressed to true when selected', () => {
    render(<StyleCard {...defaultProps} selected={true} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed to false when not selected', () => {
    render(<StyleCard {...defaultProps} selected={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle when the card is clicked', () => {
    const onToggle = vi.fn()
    render(<StyleCard {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('applies the correct gradient class for the popular group', () => {
    render(<StyleCard {...defaultProps} group="popular" />)
    expect(screen.getByRole('button').className).toContain('from-[#2a2520]')
  })

  it('applies the correct gradient class for the classic group', () => {
    render(<StyleCard {...defaultProps} group="classic" />)
    expect(screen.getByRole('button').className).toContain('from-[#2a1f1f]')
  })

  it('applies the correct gradient class for the artistic group', () => {
    render(<StyleCard {...defaultProps} group="artistic" />)
    expect(screen.getByRole('button').className).toContain('from-[#1f2028]')
  })

  it('applies the correct gradient class for the special group', () => {
    render(<StyleCard {...defaultProps} group="special" />)
    expect(screen.getByRole('button').className).toContain('from-[#1f2822]')
  })
})
