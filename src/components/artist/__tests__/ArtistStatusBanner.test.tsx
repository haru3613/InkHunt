import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ArtistStatusBanner } from '../ArtistStatusBanner'

describe('ArtistStatusBanner', () => {
  it('renders the pending review status', () => {
    render(<ArtistStatusBanner status="pending" />)
    expect(screen.getByText('待審核')).toBeInTheDocument()
    expect(screen.getByText(/1-2 個工作天內會透過 LINE 通知你/)).toBeInTheDocument()
  })

  it('renders the suspended status', () => {
    render(<ArtistStatusBanner status="suspended" />)
    expect(screen.getByText('停權')).toBeInTheDocument()
    expect(screen.getByText(/帳號目前未上線/)).toBeInTheDocument()
  })

  it('renders nothing for active artists', () => {
    const { container } = render(<ArtistStatusBanner status="active" />)
    expect(container).toBeEmptyDOMElement()
  })
})
