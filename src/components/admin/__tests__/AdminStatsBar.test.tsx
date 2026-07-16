import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminStatsBar } from '../AdminStatsBar'

describe('AdminStatsBar', () => {
  it('renders all four stat cells with counts', () => {
    render(
      <AdminStatsBar
        counts={{ pending: 2, active: 5, suspended: 1, total: 8 }}
      />,
    )

    expect(screen.getByText('待審核')).toBeInTheDocument()
    expect(screen.getByText('已上線')).toBeInTheDocument()
    expect(screen.getByText('停權')).toBeInTheDocument()
    expect(screen.getByText('總計')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
