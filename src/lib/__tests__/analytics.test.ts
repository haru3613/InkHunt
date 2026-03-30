import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GA_MEASUREMENT_ID,
  trackEvent,
  trackClickInquiry,
  trackSubmitInquiry,
  trackViewArtistProfile,
} from '@/lib/analytics'

describe('GA_MEASUREMENT_ID', () => {
  it('is exported as a string', () => {
    expect(typeof GA_MEASUREMENT_ID).toBe('string')
  })

  it('falls back to an empty string when NEXT_PUBLIC_GA_MEASUREMENT_ID is not set', () => {
    // In the test environment the env var is not set, so the fallback applies
    expect(GA_MEASUREMENT_ID).toBe(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '')
  })
})

describe('trackEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { gtag: vi.fn() })
  })

  it('calls window.gtag with the correct event name and params', () => {
    trackEvent({ action: 'test_action', category: 'test_category', label: 'test_label', value: 42 })

    expect(window.gtag).toHaveBeenCalledOnce()
    expect(window.gtag).toHaveBeenCalledWith('event', 'test_action', {
      category: 'test_category',
      label: 'test_label',
      value: 42,
    })
  })

  it('does not include action in the params object passed to gtag', () => {
    trackEvent({ action: 'my_event', label: 'lbl' })

    const [, , params] = (window.gtag as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(params).not.toHaveProperty('action')
    expect(params).toStrictEqual({ label: 'lbl' })
  })

  it('passes an empty params object when only action is provided', () => {
    trackEvent({ action: 'bare_action' })

    expect(window.gtag).toHaveBeenCalledWith('event', 'bare_action', {})
  })

  it('does nothing when window.gtag is undefined', () => {
    vi.stubGlobal('window', {})

    // Should not throw
    expect(() => trackEvent({ action: 'no_gtag' })).not.toThrow()
  })
})

describe('trackClickInquiry', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { gtag: vi.fn() })
  })

  it('calls gtag with action click_inquiry and the correct artist params', () => {
    trackClickInquiry('slug-abc', 'Artist Name')

    expect(window.gtag).toHaveBeenCalledOnce()
    expect(window.gtag).toHaveBeenCalledWith('event', 'click_inquiry', {
      artist_slug: 'slug-abc',
      artist_name: 'Artist Name',
    })
  })
})

describe('trackSubmitInquiry', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { gtag: vi.fn() })
  })

  it('calls gtag with all params when bodyPart and budgetRange are provided', () => {
    trackSubmitInquiry('slug-xyz', '手臂', '3000-5000')

    expect(window.gtag).toHaveBeenCalledOnce()
    expect(window.gtag).toHaveBeenCalledWith('event', 'submit_inquiry', {
      artist_slug: 'slug-xyz',
      body_part: '手臂',
      budget_range: '3000-5000',
    })
  })

  it('calls gtag with undefined optional params when bodyPart and budgetRange are omitted', () => {
    trackSubmitInquiry('slug-xyz')

    expect(window.gtag).toHaveBeenCalledOnce()
    expect(window.gtag).toHaveBeenCalledWith('event', 'submit_inquiry', {
      artist_slug: 'slug-xyz',
      body_part: undefined,
      budget_range: undefined,
    })
  })

  it('calls gtag with undefined budget_range when only bodyPart is provided', () => {
    trackSubmitInquiry('slug-xyz', '背部')

    expect(window.gtag).toHaveBeenCalledWith('event', 'submit_inquiry', {
      artist_slug: 'slug-xyz',
      body_part: '背部',
      budget_range: undefined,
    })
  })
})

describe('trackViewArtistProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { gtag: vi.fn() })
  })

  it('calls gtag with action view_artist_profile and the correct params', () => {
    trackViewArtistProfile('artist-slug', '極簡線條,幾何', '台北市')

    expect(window.gtag).toHaveBeenCalledOnce()
    expect(window.gtag).toHaveBeenCalledWith('event', 'view_artist_profile', {
      artist_slug: 'artist-slug',
      styles: '極簡線條,幾何',
      city: '台北市',
    })
  })
})
