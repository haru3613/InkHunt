import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Message } from '@/types/database'
import type { QuoteMetadata } from '@/types/chat'

// QuoteCard is a dependency — stub it so MessageBubble tests stay isolated
vi.mock('../QuoteCard', () => ({
  QuoteCard: ({
    price,
    note,
    status,
  }: {
    price: number
    note: string | null
    status: string
    [key: string]: unknown
  }) => (
    <div data-testid="quote-card">
      <span data-testid="quote-price">NT${price.toLocaleString()}</span>
      {note && <span data-testid="quote-note">{note}</span>}
      <span data-testid="quote-status">{status}</span>
    </div>
  ),
}))

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    inquiry_id: 'inq-1',
    sender_type: 'consumer',
    sender_id: 'user-1',
    message_type: 'text',
    content: 'Hello!',
    metadata: {} as Message['metadata'],
    read_at: null,
    created_at: '2026-03-29T10:00:00Z',
    ...overrides,
  }
}

describe('MessageBubble', () => {
  it('renders text message content', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const message = makeMessage({ content: '你好，請問有空嗎？' })
    render(<MessageBubble message={message} isOwn={false} />)
    expect(screen.getByText('你好，請問有空嗎？')).toBeInTheDocument()
  })

  it('aligns own messages to the right', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const message = makeMessage()
    const { container } = render(<MessageBubble message={message} isOwn={true} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-end')
  })

  it('aligns other messages to the left', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const message = makeMessage()
    const { container } = render(<MessageBubble message={message} isOwn={false} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-start')
  })

  it('renders image message with an img element', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const message = makeMessage({
      message_type: 'image',
      content: 'https://example.com/tattoo.jpg',
    })
    render(<MessageBubble message={message} isOwn={false} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/tattoo.jpg')
    expect(img).toHaveAttribute('alt', 'Shared image')
  })

  it('renders system message with centred layout', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const message = makeMessage({
      message_type: 'system',
      content: '詢價已送出\n風格：極簡線條\n部位：手臂',
    })
    const { container } = render(<MessageBubble message={message} isOwn={false} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-center')
    expect(screen.getByText('詢價已送出')).toBeInTheDocument()
    expect(screen.getByText('風格：極簡線條')).toBeInTheDocument()
  })

  it('renders quote message using QuoteCard', async () => {
    const { MessageBubble } = await import('../MessageBubble')
    const quoteMetadata: QuoteMetadata = {
      quote_id: 'q-1',
      price: 8000,
      note: '含設計費',
      available_dates: ['2026-04-01'],
      status: 'sent',
    }
    const message = makeMessage({
      message_type: 'quote',
      metadata: quoteMetadata as unknown as Message['metadata'],
    })
    render(<MessageBubble message={message} isOwn={false} />)
    expect(screen.getByTestId('quote-card')).toBeInTheDocument()
    expect(screen.getByTestId('quote-price')).toHaveTextContent('NT$8,000')
  })
})
