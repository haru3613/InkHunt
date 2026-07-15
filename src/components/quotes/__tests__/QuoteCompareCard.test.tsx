import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteCompareCard } from '../QuoteCompareCard'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/artists/ArtistAvatar', () => ({
  ArtistAvatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}))

describe('QuoteCompareCard', () => {
  it('shows waiting state when there is no quote', () => {
    render(
      <QuoteCompareCard
        artistName="Ink Wolf"
        artistAvatar={null}
        artistCity="台北市"
        artistSlug="ink-wolf"
        quote={null}
        inquiryId="inq-1"
        onAccept={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Ink Wolf').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('台北市')).toBeInTheDocument()
    expect(screen.getByText('waiting')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'accept' })).not.toBeInTheDocument()
  })

  it('shows quote details and accept button for sent quotes', async () => {
    const onAccept = vi.fn()
    const user = userEvent.setup()
    render(
      <QuoteCompareCard
        artistName="Ink Wolf"
        artistAvatar={null}
        artistCity={null}
        artistSlug="ink-wolf"
        quote={{
          id: 'q1',
          price: 5000,
          note: '可本週',
          status: 'sent',
          available_dates: '週六下午',
        }}
        inquiryId="inq-1"
        onAccept={onAccept}
      />,
    )

    expect(screen.getByText(/5,000/)).toBeInTheDocument()
    expect(screen.getByText('可本週')).toBeInTheDocument()
    expect(screen.getByText('週六下午')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /chat/ })).toHaveAttribute(
      'href',
      '/inquiries/inq-1',
    )
    expect(screen.getByRole('link', { name: /viewProfile/ })).toHaveAttribute(
      'href',
      '/artists/ink-wolf',
    )

    await user.click(screen.getByRole('button', { name: 'accept' }))
    expect(onAccept).toHaveBeenCalled()
  })
}
)
