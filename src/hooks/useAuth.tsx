'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { lineLoginUrl } from '@/lib/auth/login-url'

interface AuthState {
  isLoading: boolean
  isLoggedIn: boolean
  isAdmin: boolean
  user: {
    lineUserId: string
    displayName: string
    avatarUrl: string | null
  } | null
  artist: {
    id: string
    slug: string
    display_name: string
    status: 'pending' | 'active' | 'suspended'
    price_min: number | null
    portfolio_count: number
  } | null
}

interface AuthContextValue extends AuthState {
  loginWithRedirect: (redirectTo?: string) => void
  logout: () => Promise<void>
  refetch: () => Promise<AuthState | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const LOGGED_OUT: AuthState = {
  isLoading: false,
  isLoggedIn: false,
  isAdmin: false,
  user: null,
  artist: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...LOGGED_OUT,
    isLoading: true,
  })

  // Auth events can arrive close together (especially INITIAL_SESSION followed by
  // SIGNED_IN when a tab regains focus). Keep the API response as the only source
  // of authorization truth, while coalescing equivalent automatic refreshes.
  const mountedRef = useRef(false)
  const generationRef = useRef(0)
  const requestIdRef = useRef(0)
  const automaticRequestRef = useRef<Promise<AuthState | null> | null>(null)
  const controllersRef = useRef(new Set<AbortController>())
  const sessionIdentityRef = useRef<string | null | undefined>(undefined)

  const invalidateRequests = useCallback(() => {
    generationRef.current += 1
    requestIdRef.current += 1
    automaticRequestRef.current = null
    for (const controller of controllersRef.current) {
      controller.abort()
    }
    controllersRef.current.clear()
  }, [])

  const fetchAuthState = useCallback((mode: 'automatic' | 'manual' = 'manual') => {
    if (mode === 'automatic' && automaticRequestRef.current) {
      return automaticRequestRef.current
    }

    const generation = generationRef.current
    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    controllersRef.current.add(controller)
    const canApply = () => (
      mountedRef.current
      && generation === generationRef.current
      && requestId === requestIdRef.current
    )

    const request = (async () => {
      try {
        const response = await fetch('/api/auth/me', { signal: controller.signal })
        if (!canApply()) return null

        if (!response.ok) {
          setState(LOGGED_OUT)
          return null
        }

        const data = await response.json()
        if (!canApply()) return null

        const nextState: AuthState = {
          isLoading: false,
          isLoggedIn: !!data.user,
          isAdmin: Boolean(data.isAdmin),
          user: data.user,
          artist: data.artist,
        }
        setState(nextState)
        return nextState
      } catch {
        if (canApply()) {
          setState(LOGGED_OUT)
        }
        return null
      } finally {
        controllersRef.current.delete(controller)
      }
    })()

    if (mode === 'automatic') {
      automaticRequestRef.current = request
      void request.finally(() => {
        if (automaticRequestRef.current === request) {
          automaticRequestRef.current = null
        }
      })
    }

    return request
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(LOGGED_OUT)
      return
    }

    mountedRef.current = true
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionIdentityRef.current = null
        invalidateRequests()
        setState(LOGGED_OUT)
        return
      }

      // The session only identifies a changed browser session; it is never used
      // to authorize or populate the UI. /api/auth/me remains authoritative.
      const sessionIdentity = session?.user?.id ?? null
      if (
        sessionIdentityRef.current !== undefined
        && sessionIdentityRef.current !== sessionIdentity
      ) {
        invalidateRequests()
      }
      sessionIdentityRef.current = sessionIdentity
      void fetchAuthState('automatic')
    })
    return () => {
      mountedRef.current = false
      invalidateRequests()
      subscription.unsubscribe()
    }
  }, [fetchAuthState, invalidateRequests])

  const loginWithRedirect = useCallback((redirectTo?: string) => {
    window.location.href = lineLoginUrl(redirectTo)
  }, [])

  const logout = useCallback(async () => {
    invalidateRequests()
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setState(LOGGED_OUT)
  }, [invalidateRequests])

  return (
    <AuthContext.Provider value={{ ...state, loginWithRedirect, logout, refetch: fetchAuthState }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
