import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FavoriteButton } from '../FavoriteButton'

const ARTIST_ID = '11111111-1111-4111-8111-111111111111'

// Mutable auth state the mocked useAuth returns; tests tweak before render.
const authState = vi.hoisted(() => ({
  isLoading: false,
  isLoggedIn: true,
  loginWithRedirect: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}))

function mockFetchOnce(ok: boolean) {
  const fetchMock = vi.fn().mockResolvedValue({ ok })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    authState.isLoading = false
    authState.isLoggedIn = true
    authState.loginWithRedirect.mockReset()
    vi.unstubAllGlobals()
  })

  it('renders an unfilled heart when initialFavorited is false', () => {
    mockFetchOnce(true)
    render(<FavoriteButton artistId={ARTIST_ID} initialFavorited={false} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('POSTs to /api/favorites with the artistId and flips to filled on tap', async () => {
    const fetchMock = mockFetchOnce(true)
    render(<FavoriteButton artistId={ARTIST_ID} initialFavorited={false} />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Optimistic flip is immediate.
    expect(button).toHaveAttribute('aria-pressed', 'true')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/favorites')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ artistId: ARTIST_ID })

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
  })

  it('DELETEs /api/favorites/<artistId> and flips back when already saved', async () => {
    const fetchMock = mockFetchOnce(true)
    render(<FavoriteButton artistId={ARTIST_ID} initialFavorited={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/favorites/${ARTIST_ID}`)
    expect(init.method).toBe('DELETE')

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
  })

  it('reverts optimistic state when the request fails', async () => {
    mockFetchOnce(false)
    render(<FavoriteButton artistId={ARTIST_ID} initialFavorited={false} />)

    const button = screen.getByRole('button')
    fireEvent.click(button)
    // Optimistic flip first…
    expect(button).toHaveAttribute('aria-pressed', 'true')
    // …then revert once the failed response resolves.
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
  })

  it('routes to login and does NOT call the API when logged out', () => {
    authState.isLoggedIn = false
    const fetchMock = mockFetchOnce(true)
    render(<FavoriteButton artistId={ARTIST_ID} initialFavorited={false} />)

    fireEvent.click(screen.getByRole('button'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(authState.loginWithRedirect).toHaveBeenCalledTimes(1)
  })
})
