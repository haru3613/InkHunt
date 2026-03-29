import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// Supabase client mock — set up before any import that reaches @/lib/supabase/client
const mockUnsubscribe = vi.fn()
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
}))
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  })),
}))

import { AuthProvider, useAuth } from '../useAuth'
import { isSupabaseConfigured } from '@/lib/supabase/client'

const mockedIsSupabaseConfigured = vi.mocked(isSupabaseConfigured)

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

const mockUserResponse = {
  user: {
    lineUserId: 'U_test_user',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  artist: {
    id: 'artist-uuid-1',
    slug: 'test-artist',
    display_name: 'Test Artist',
    status: 'active' as const,
    price_min: 3000,
    portfolio_count: 5,
  },
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedIsSupabaseConfigured.mockReturnValue(true)
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
    mockSignOut.mockResolvedValue(undefined)
    // Default: no session
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })
  })

  it('throws when used outside AuthProvider', () => {
    // Suppress the React error boundary console.error noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
    consoleSpy.mockRestore()
  })

  it('starts in loading state before fetch resolves', () => {
    // Never-resolving promise to keep loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('sets user and artist after successful /api/auth/me fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserResponse,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.user).toEqual(mockUserResponse.user)
    expect(result.current.artist).toEqual(mockUserResponse.artist)
  })

  it('sets null user when fetch returns no user field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null, artist: null }),
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.artist).toBeNull()
  })

  it('handles fetch error gracefully — resets to unauthenticated', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('sets isLoggedIn false when /api/auth/me returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('loginWithRedirect sets window.location.href to LINE auth endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserResponse,
    })

    // jsdom doesn't allow direct assignment of window.location; spy via Object.defineProperty
    const originalLocation = window.location
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockLocation,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.loginWithRedirect('/artist/dashboard')
    })

    expect(window.location.href).toBe('/api/auth/line?redirect=%2Fartist%2Fdashboard')

    // Restore
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
  })

  it('loginWithRedirect without redirect param omits query string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserResponse,
    })

    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', { writable: true, value: mockLocation })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.loginWithRedirect()
    })

    expect(window.location.href).toBe('/api/auth/line')
  })

  it('logout calls supabase.auth.signOut and resets state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserResponse,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true))

    await act(async () => {
      await result.current.logout()
    })

    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.artist).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('logout skips signOut when Supabase is not configured', async () => {
    mockedIsSupabaseConfigured.mockReturnValue(false)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.logout()
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(result.current.isLoggedIn).toBe(false)
  })
})
