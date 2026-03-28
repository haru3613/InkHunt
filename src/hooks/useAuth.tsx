'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

interface AuthState {
  isLoading: boolean
  isLoggedIn: boolean
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
  } | null
}

interface AuthContextValue extends AuthState {
  loginWithRedirect: (redirectTo?: string) => void
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isLoggedIn: false,
    user: null,
    artist: null,
  })

  const fetchAuthState = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
        return
      }
      const data = await response.json()
      setState({
        isLoading: false,
        isLoggedIn: !!data.user,
        user: data.user,
        artist: data.artist,
      })
    } catch {
      setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard clause for missing config, not a cascading render
      setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
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
    const params = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    window.location.href = `/api/auth/line${params}`
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
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
