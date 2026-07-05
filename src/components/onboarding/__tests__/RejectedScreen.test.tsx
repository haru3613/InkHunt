import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RejectedScreen } from '../RejectedScreen'

describe('RejectedScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('location', { reload: vi.fn() })
  })

  it('shows the rejected heading', () => {
    render(<RejectedScreen />)
    expect(screen.getByRole('heading', { name: '審核未通過' })).toBeInTheDocument()
  })

  it('tells applicants they can update their profile and re-apply', () => {
    render(<RejectedScreen />)
    expect(screen.getByText(/更新作品集與個人資料/)).toBeInTheDocument()
    expect(screen.getAllByText(/重新送審/).length).toBeGreaterThan(0)
  })

  it('lets the rejected artist resubmit their profile for review', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'pending' }), { status: 200 }))

    render(<RejectedScreen />)
    await userEvent.click(screen.getByRole('button', { name: '重新送審' }))

    expect(fetch).toHaveBeenCalledWith('/api/artists/me/resubmit', { method: 'POST' })
    await waitFor(() => expect(location.reload).toHaveBeenCalled())
  })

  it('keeps the rejected artist on the screen when resubmit fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'Artist is not rejected' }), { status: 409 }))

    render(<RejectedScreen />)
    await userEvent.click(screen.getByRole('button', { name: '重新送審' }))

    expect(await screen.findByText('送審失敗，請稍後再試。')).toBeInTheDocument()
    expect(location.reload).not.toHaveBeenCalled()
  })
})
