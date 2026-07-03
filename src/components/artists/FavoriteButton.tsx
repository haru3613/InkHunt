'use client'

import { useState, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FavoriteButtonProps {
  readonly artistId: string
  readonly initialFavorited?: boolean
}

/**
 * Heart toggle that saves/unsaves an artist via the favorites API.
 *
 * - Optimistic: local state flips immediately on tap and reverts if the request
 *   fails, so the UI never lies about a failed save.
 * - Logged-out taps route to login (no API call) — the favorites API is auth-gated.
 */
export function FavoriteButton({ artistId, initialFavorited = false }: FavoriteButtonProps) {
  const { isLoggedIn, loginWithRedirect } = useAuth()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [pending, setPending] = useState(false)

  const handleClick = useCallback(async () => {
    if (!isLoggedIn) {
      loginWithRedirect()
      return
    }
    if (pending) return

    const next = !favorited
    // Optimistic flip — revert below if the request fails.
    setFavorited(next)
    setPending(true)

    try {
      const res = next
        ? await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId }),
          })
        : await fetch(`/api/favorites/${artistId}`, { method: 'DELETE' })

      if (!res.ok) {
        setFavorited(!next)
      }
    } catch {
      setFavorited(!next)
    } finally {
      setPending(false)
    }
  }, [isLoggedIn, loginWithRedirect, pending, favorited, artistId])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={favorited}
      aria-label={favorited ? '取消收藏' : '收藏'}
      className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:text-[#f87171] disabled:opacity-50"
    >
      <Heart
        className={
          favorited ? 'size-5 fill-[#f87171] text-[#f87171]' : 'size-5'
        }
      />
    </button>
  )
}
