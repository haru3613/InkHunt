import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReviewForm } from '../ReviewForm'

const ARTIST_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'

function renderForm(
  overrides: Partial<React.ComponentProps<typeof ReviewForm>> = {},
) {
  const onSubmit = overrides.onSubmit ?? vi.fn()
  render(
    <ReviewForm artistId={ARTIST_ID} onSubmit={onSubmit} {...overrides} />,
  )
  return { onSubmit }
}

describe('ReviewForm', () => {
  it('renders an interactive star rating and a comment textarea', () => {
    renderForm()

    // Interactive StarRating exposes a radiogroup of star buttons.
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5 顆星' })).toBeInTheDocument()
    // Comment textarea is present and reachable by its accessible label.
    expect(screen.getByLabelText(/評論/)).toBeInTheDocument()
  })

  it('does NOT call onSubmit and surfaces an error when no rating is picked', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    // Leave the rating untouched (0) — schema requires rating >= 1.
    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    // The schema's rating message is surfaced inline.
    expect(screen.getByText('評分至少 1 顆星')).toBeInTheDocument()
  })

  it('does NOT call onSubmit and surfaces an error when the comment is too long', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(screen.getByRole('radio', { name: '4 顆星' }))

    // Inject an over-long comment directly (1001 chars) to avoid 1000 keystrokes.
    const textarea = screen.getByLabelText(/評論/) as HTMLTextAreaElement
    const tooLong = 'x'.repeat(1001)
    // fireEvent-style set via user-event paste keeps the controlled value in sync.
    textarea.focus()
    await user.paste(tooLong)

    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('評論不能超過 1000 字')).toBeInTheDocument()
  })

  it('calls onSubmit exactly once with the validated payload on a valid submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    await user.click(screen.getByRole('radio', { name: '4 顆星' }))
    await user.type(screen.getByLabelText(/評論/), '很棒的體驗')

    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      comment: '很棒的體驗',
      artistId: ARTIST_ID,
    })
  })

  it('submits successfully with no comment (comment is optional)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    await user.click(screen.getByRole('radio', { name: '5 顆星' }))
    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.rating).toBe(5)
    expect(payload.artistId).toBe(ARTIST_ID)
    // Empty comment must not be sent as an empty string failing the parent's expectations.
    expect(payload.comment === undefined || payload.comment === '').toBe(true)
  })

  it('disables the submit button while isSubmitting is true', () => {
    renderForm({ isSubmitting: true })

    expect(screen.getByRole('button', { name: /送出評價|提交|送出中/ })).toBeDisabled()
  })

  it('does not call onSubmit when clicked while isSubmitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit, isSubmitting: true })

    await user.click(screen.getByRole('radio', { name: '5 顆星' }))
    await user.click(screen.getByRole('button', { name: /送出評價|提交|送出中/ }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears the rating error once a rating is chosen and resubmitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    // First submit with no rating -> error.
    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))
    expect(screen.getByText('評分至少 1 顆星')).toBeInTheDocument()

    // Pick a rating and resubmit -> error gone, onSubmit fires.
    await user.click(screen.getByRole('radio', { name: '3 顆星' }))
    await user.click(screen.getByRole('button', { name: /送出評價|提交/ }))

    expect(screen.queryByText('評分至少 1 顆星')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 3,
      artistId: ARTIST_ID,
      comment: undefined,
    })
  })
})
