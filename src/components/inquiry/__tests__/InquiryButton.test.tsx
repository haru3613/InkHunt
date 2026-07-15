import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InquiryButton } from '../InquiryButton'

const trackClickInquiry = vi.hoisted(() => vi.fn())

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/lib/analytics', () => ({
  trackClickInquiry,
}))

vi.mock('../InquiryForm', () => ({
  InquiryForm: ({
    open,
    artistName,
  }: {
    open: boolean
    artistName: string
  }) => (open ? <div data-testid="inquiry-form">form:{artistName}</div> : null),
}))

describe('InquiryButton', () => {
  beforeEach(() => {
    trackClickInquiry.mockReset()
  })

  it('opens the inquiry form and tracks when slug is provided', async () => {
    const user = userEvent.setup()
    render(
      <InquiryButton
        artistId="a1"
        artistName="Ink Wolf"
        artistSlug="ink-wolf"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'inquire' }))
    expect(trackClickInquiry).toHaveBeenCalledWith('ink-wolf', 'Ink Wolf')
    expect(screen.getByTestId('inquiry-form')).toHaveTextContent('form:Ink Wolf')
  })

  it('opens form without tracking when slug is missing', async () => {
    const user = userEvent.setup()
    render(<InquiryButton artistId="a1" artistName="Ink Wolf" />)

    await user.click(screen.getByRole('button', { name: 'inquire' }))
    expect(trackClickInquiry).not.toHaveBeenCalled()
    expect(screen.getByTestId('inquiry-form')).toBeInTheDocument()
  })
})
