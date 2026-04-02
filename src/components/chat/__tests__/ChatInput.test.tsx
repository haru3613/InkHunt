import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../ChatInput'

vi.mock('@/lib/upload/client', () => ({ uploadFile: vi.fn() }))

// lucide-react icons render as SVGs without accessible names — stub them so
// role-based queries work reliably across environments
vi.mock('lucide-react', () => ({
  Send: () => <svg data-testid="icon-send" />,
  Image: () => <svg data-testid="icon-image" />,
  DollarSign: () => <svg data-testid="icon-dollar" />,
}))

describe('ChatInput', () => {
  const onSendMessage = vi.fn()
  const onSendQuote = vi.fn()

  beforeEach(() => {
    onSendMessage.mockClear()
    onSendQuote.mockClear()
  })

  it('renders text input and send button', () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    expect(screen.getByPlaceholderText('輸入訊息...')).toBeInTheDocument()
    expect(screen.getByTestId('icon-send').closest('button')).toBeInTheDocument()
  })

  it('send button is disabled when text input is empty', () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const sendBtn = screen.getByTestId('icon-send').closest('button') as HTMLButtonElement
    expect(sendBtn).toBeDisabled()
  })

  it('calls onSendMessage with type "text" and trimmed content when send button clicked', async () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const input = screen.getByPlaceholderText('輸入訊息...')
    await userEvent.type(input, '  你好  ')

    const sendBtn = screen.getByTestId('icon-send').closest('button') as HTMLButtonElement
    await userEvent.click(sendBtn)

    expect(onSendMessage).toHaveBeenCalledOnce()
    expect(onSendMessage).toHaveBeenCalledWith('text', '你好')
  })

  it('clears the input after a message is sent', async () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const input = screen.getByPlaceholderText('輸入訊息...')
    await userEvent.type(input, 'Hello')

    const sendBtn = screen.getByTestId('icon-send').closest('button') as HTMLButtonElement
    await userEvent.click(sendBtn)

    expect((input as HTMLInputElement).value).toBe('')
  })

  it('sends the message when Enter key is pressed', async () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const input = screen.getByPlaceholderText('輸入訊息...')
    await userEvent.type(input, '按 Enter 送出{Enter}')

    expect(onSendMessage).toHaveBeenCalledOnce()
    expect(onSendMessage).toHaveBeenCalledWith('text', '按 Enter 送出')
  })

  it('does not send when Shift+Enter is pressed', async () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const input = screen.getByPlaceholderText('輸入訊息...')
    await userEvent.type(input, 'no send{Shift>}{Enter}{/Shift}')

    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it('shows the quote button only when isArtist is true and onSendQuote is provided', () => {
    const { rerender } = render(
      <ChatInput onSendMessage={onSendMessage} onSendQuote={onSendQuote} isArtist={true} />,
    )
    expect(screen.getByTestId('icon-dollar')).toBeInTheDocument()

    rerender(<ChatInput onSendMessage={onSendMessage} onSendQuote={onSendQuote} isArtist={false} />)
    expect(screen.queryByTestId('icon-dollar')).not.toBeInTheDocument()
  })

  it('does not show quote button when isArtist is true but onSendQuote is not provided', () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={true} />)
    expect(screen.queryByTestId('icon-dollar')).not.toBeInTheDocument()
  })

  it('calls onSendQuote when the quote button is clicked', async () => {
    render(
      <ChatInput onSendMessage={onSendMessage} onSendQuote={onSendQuote} isArtist={true} />,
    )

    const quoteBtn = screen.getByTestId('icon-dollar').closest('button') as HTMLButtonElement
    await userEvent.click(quoteBtn)

    expect(onSendQuote).toHaveBeenCalledOnce()
  })

  it('does not call onSendMessage when text is empty or whitespace only', async () => {
    render(<ChatInput onSendMessage={onSendMessage} isArtist={false} />)

    const input = screen.getByPlaceholderText('輸入訊息...')
    await userEvent.type(input, '   ')

    const sendBtn = screen.getByTestId('icon-send').closest('button') as HTMLButtonElement
    // Button is disabled for whitespace-only text, but we also verify via Enter
    await userEvent.type(input, '{Enter}')

    expect(onSendMessage).not.toHaveBeenCalled()
    expect(sendBtn).toBeDisabled()
  })

  it('disables input and all buttons when disabled prop is true', () => {
    render(
      <ChatInput
        onSendMessage={onSendMessage}
        onSendQuote={onSendQuote}
        isArtist={true}
        disabled={true}
      />,
    )

    expect(screen.getByPlaceholderText('輸入訊息...')).toBeDisabled()

    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
