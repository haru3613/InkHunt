import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StyleBadge } from '../StyleBadge'

describe('StyleBadge', () => {
  it('renders the style name', () => {
    render(<StyleBadge name="極簡線條" />)
    expect(screen.getByText('極簡線條')).toBeInTheDocument()
  })

  it('renders the icon when provided', () => {
    render(<StyleBadge name="幾何" icon="★" />)
    expect(screen.getByText('★')).toBeInTheDocument()
    expect(screen.getByText('幾何')).toBeInTheDocument()
  })

  it('does not render an icon span when icon is not provided', () => {
    const { container } = render(<StyleBadge name="黑灰寫實" />)
    // Only the badge text should appear, no extra span for icon
    const spans = container.querySelectorAll('span')
    const iconSpans = Array.from(spans).filter((s) => s.textContent !== '黑灰寫實')
    expect(iconSpans).toHaveLength(0)
  })

  it('applies active styling class when active prop is true', () => {
    const { container } = render(<StyleBadge name="新傳統" active={true} />)
    // active badge gets bg-primary class
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-primary')
  })

  it('does not apply active class when active is false (default)', () => {
    const { container } = render(<StyleBadge name="新傳統" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).not.toContain('bg-primary')
  })
})
