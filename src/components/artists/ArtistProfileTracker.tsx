'use client'

import { useEffect } from 'react'
import { trackViewArtistProfile } from '@/lib/analytics'

interface ArtistProfileTrackerProps {
  readonly artistSlug: string
  readonly styles: string
  readonly city: string
}

export function ArtistProfileTracker({
  artistSlug,
  styles,
  city,
}: ArtistProfileTrackerProps) {
  useEffect(() => {
    trackViewArtistProfile(artistSlug, styles, city)
  }, [artistSlug, styles, city])

  return null
}
