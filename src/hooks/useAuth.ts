'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isLoggedIn: false,
    user: null,
    artist: null,
  })

  const fetchAuthState = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
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

  return { ...state, loginWithRedirect, logout, refetch: fetchAuthState }
}
