'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
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
  refetch: () => Promise<void>
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

  const fetchAuthState = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        setState(LOGGED_OUT)
        return
      }
      const data = await response.json()
      setState({
        isLoading: false,
        isLoggedIn: !!data.user,
        isAdmin: Boolean(data.isAdmin),
        user: data.user,
        artist: data.artist,
      })
    } catch {
      setState(LOGGED_OUT)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard clause for missing config, not a cascading render
      setState(LOGGED_OUT)
      return
    }

    fetchAuthState()
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAuthState()
    })
    return () => subscription.unsubscribe()
  }, [fetchAuthState])

  const loginWithRedirect = useCallback((redirectTo?: string) => {
    window.location.href = lineLoginUrl(redirectTo)
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setState(LOGGED_OUT)
  }, [])

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
