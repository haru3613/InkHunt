'use client'
import { useState, useCallback } from 'react'

const MAX_COMPARE = 3

interface CompareArtist {
  readonly id: string
  readonly display_name: string
  readonly slug: string
  readonly avatar_url: string | null
}

export function useCompareList() {
  const [artists, setArtists] = useState<CompareArtist[]>([])

  const add = useCallback((artist: CompareArtist) => {
    setArtists((prev) => {
      if (prev.length >= MAX_COMPARE) return prev
      if (prev.some((a) => a.id === artist.id)) return prev
      return [...prev, artist]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setArtists((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clear = useCallback(() => setArtists([]), [])

  const has = useCallback((id: string) => artists.some((a) => a.id === id), [artists])

  return {
    artists,
    count: artists.length,
    isFull: artists.length >= MAX_COMPARE,
    add,
    remove,
    clear,
    has,
  }
}
