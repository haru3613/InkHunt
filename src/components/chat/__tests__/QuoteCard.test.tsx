import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteCard } from '../QuoteCard'

describe('QuoteCard', () => {
  it('renders the price formatted with NT$ and thousands separator', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={12500}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={true}
      />,
    )
    expect(screen.getByText('NT$12,500')).toBeInTheDocument()
  })

  it('renders the note when provided', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={5000}
        note="含設計費，不含上色"
        availableDates={null}
        status="sent"
        isOwn={true}
      />,
    )
    expect(screen.getByText('含設計費，不含上色')).toBeInTheDocument()
  })

  it('does not render note section when note is null', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={5000}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={true}
      />,
    )
    expect(screen.queryByText(/含/)).not.toBeInTheDocument()
  })

  it('shows accept and reject buttons for pending quote when not own', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={5000}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={false}
      />,
    )
    expect(screen.getByRole('button', { name: '接受' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '拒絕' })).toBeInTheDocument()
  })

  it('does not show action buttons when isOwn is true', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={5000}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={true}
      />,
    )
    expect(screen.queryByRole('button', { name: '接受' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '拒絕' })).not.toBeInTheDocument()
  })

  it('calls onAction with accepted when accept button is clicked', async () => {
    const onAction = vi.fn()
    render(
      <QuoteCard
        quoteId="q-42"
        price={5000}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={false}
        onAction={onAction}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '接受' }))
    expect(onAction).toHaveBeenCalledWith('q-42', 'accepted')
  })

  it('calls onAction with rejected when reject button is clicked', async () => {
    const onAction = vi.fn()
    render(
      <QuoteCard
        quoteId="q-42"
        price={5000}
        note={null}
        availableDates={null}
        status="sent"
        isOwn={false}
        onAction={onAction}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: '拒絕' }))
    expect(onAction).toHaveBeenCalledWith('q-42', 'rejected')
  })

  it('shows status label instead of action buttons for non-pending status', () => {
    render(
      <QuoteCard
        quoteId="q-1"
        price={5000}
        note={null}
        availableDates={null}
        status="accepted"
        isOwn={false}
      />,
    )
    expect(screen.queryByRole('button', { name: '接受' })).not.toBeInTheDocument()
    expect(screen.getByText('已接受')).toBeInTheDocument()
  })
})
