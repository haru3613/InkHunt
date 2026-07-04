import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { RejectedScreen } from '../RejectedScreen'

describe('RejectedScreen', () => {
  it('shows the rejected heading', () => {
    render(<RejectedScreen />)
    expect(screen.getByRole('heading', { name: '審核未通過' })).toBeInTheDocument()
  })

  it('tells applicants they can update their profile and re-apply', () => {
    render(<RejectedScreen />)
    expect(screen.getByText(/更新作品集與個人資料/)).toBeInTheDocument()
    expect(screen.getAllByText(/重新送審/).length).toBeGreaterThan(0)
  })
})
