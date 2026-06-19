import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: mockRefresh, push: vi.fn() })),
}))

// Logged-in user by default — gating is exercised in its own test.
const mockUseAuth = vi.fn(() => ({
  isLoggedIn: true,
  loginWithRedirect: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import { ArtistReviewFormSection } from '../ArtistReviewFormSection'

const ARTIST_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
const SLUG = 'inkmaster'

function renderSection() {
  render(<ArtistReviewFormSection artistId={ARTIST_ID} artistSlug={SLUG} />)
}

/** Pick 5 stars + submit — drives a schema-valid payload through ReviewForm. */
async function submitValid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: '5 顆星' }))
  await user.click(screen.getByRole('button', { name: /送出評價/ }))
}

describe('ArtistReviewFormSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isLoggedIn: true, loginWithRedirect: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to the artist reviews route exactly once on a valid submit, then refreshes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'rev-1' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/artists/${SLUG}/reviews`)
    expect(init.method).toBe('POST')
    const sentBody = JSON.parse(init.body as string)
    expect(sentBody.rating).toBe(5)
    expect(sentBody.artistId).toBe(ARTIST_ID)
    // No client-supplied author — the server derives it from the session.
    expect(sentBody).not.toHaveProperty('author_line_user_id')

    // Refreshes the server component so the new review shows in the list.
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('disables the submit button while the request is in flight (isSubmitting)', async () => {
    let resolveFetch: (r: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    const fetchMock = vi.fn().mockReturnValue(pending)
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    // While in flight, the submit button is disabled.
    const button = screen.getByRole('button', { name: /送出中|送出評價/ })
    await waitFor(() => expect(button).toBeDisabled())

    // Resolve and confirm it re-enables afterwards.
    resolveFetch(new Response(JSON.stringify({ id: 'rev-1' }), { status: 201 }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('surfaces an error (does not crash) when the route returns 409 duplicate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: '你已經評價過這位刺青師' }), { status: 409 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    await waitFor(() =>
      expect(screen.getByText('你已經評價過這位刺青師')).toBeInTheDocument(),
    )
    // Did not refresh on failure.
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('surfaces a generic error (does not crash) when the route returns 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Validation failed' }), { status: 400 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('prompts login instead of POSTing when the user is logged out', async () => {
    const loginWithRedirect = vi.fn()
    mockUseAuth.mockReturnValue({ isLoggedIn: false, loginWithRedirect })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    expect(loginWithRedirect).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a success message and hides the form after a successful submit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'rev-1' }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderSection()

    await submitValid(user)

    await waitFor(() => expect(screen.getByText(/感謝|已送出/)).toBeInTheDocument())
    // Form is replaced by the thank-you state.
    expect(screen.queryByRole('button', { name: /送出評價/ })).not.toBeInTheDocument()
  })
})
