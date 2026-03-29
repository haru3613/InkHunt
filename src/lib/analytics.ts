export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''

type GtagEvent = {
  action: string
  category?: string
  label?: string
  value?: number
  [key: string]: string | number | undefined
}

export function trackEvent({ action, ...params }: GtagEvent) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', action, params)
}

export function trackClickInquiry(artistSlug: string, artistName: string) {
  trackEvent({ action: 'click_inquiry', artist_slug: artistSlug, artist_name: artistName })
}

export function trackSubmitInquiry(
  artistSlug: string,
  bodyPart?: string,
  budgetRange?: string,
) {
  trackEvent({
    action: 'submit_inquiry',
    artist_slug: artistSlug,
    body_part: bodyPart,
    budget_range: budgetRange,
  })
}

export function trackViewArtistProfile(
  artistSlug: string,
  styles: string,
  city: string,
) {
  trackEvent({ action: 'view_artist_profile', artist_slug: artistSlug, styles, city })
}

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}
