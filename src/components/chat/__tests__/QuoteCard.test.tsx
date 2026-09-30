import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteCard } from '../QuoteCard'

vi.mock('next-intl', () => ({ useLocale: () => 'zh-TW' }))

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
    expect(screen.getByRole('button', { name: '接受報價' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '婉拒' })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: '接受報價' }))
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
    await userEvent.click(screen.getByRole('button', { name: '婉拒' }))
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
    expect(screen.getByText(/已接受報價，請在聊天室安排預約日期/)).toBeInTheDocument()
  })

  it('allows an unread viewed quote to be accepted', () => {
    render(<QuoteCard quoteId="q-viewed" price={5000} note={null} availableDates={null} status="viewed" isOwn={false} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: '接受報價' })).toBeInTheDocument()
  })

  it('disables both actions synchronously while a request is in flight', async () => {
    let resolveAction!: () => void
    const onAction = vi.fn(() => new Promise<void>((resolve) => { resolveAction = resolve }))
    render(<QuoteCard quoteId="q-pending" price={5000} note={null} availableDates={null} status="sent" isOwn={false} onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: '接受報價' }))
    await userEvent.click(screen.getByRole('button', { name: '婉拒' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '處理中…' })).toBeDisabled()
    resolveAction()
  })

  it('keeps actions available and reports an action error for retry', async () => {
    const onAction = vi.fn().mockRejectedValue(new Error('offline'))
    render(<QuoteCard quoteId="q-retry" price={5000} note={null} availableDates={null} status="sent" isOwn={false} onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: '接受報價' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('更新報價狀態失敗')
    expect(screen.getByRole('button', { name: '接受報價' })).not.toBeDisabled()
  })
})
