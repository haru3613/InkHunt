import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

import { reportError, scrubAuthParams } from '../observability'
import type { ErrorEvent } from '@sentry/nextjs'

beforeEach(() => {
  mockCaptureException.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('reportError', () => {
  it('logs to console and forwards to Sentry with the scope tag', () => {
    const err = new Error('boom')
    reportError('line-messaging', err, { inquiryId: 'i-1' })

    expect(console.error).toHaveBeenCalled()
    expect(mockCaptureException).toHaveBeenCalledWith(err, {
      tags: { scope: 'line-messaging' },
      extra: { inquiryId: 'i-1' },
    })
  })

  it('never throws even if Sentry capture fails', () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('sentry down')
    })
    expect(() => reportError('api', new Error('boom'))).not.toThrow()
  })
})

describe('scrubAuthParams', () => {
  it('redacts OAuth code/state in request url and query_string', () => {
    const event = {
      request: {
        url: 'https://inkhunt.tw/api/auth/line/callback?code=SECRET&state=TOKEN&foo=1',
        query_string: 'code=SECRET&state=TOKEN&foo=1',
      },
    } as ErrorEvent

    const out = scrubAuthParams(event)

    expect(out.request!.url).toBe(
      'https://inkhunt.tw/api/auth/line/callback?code=[redacted]&state=[redacted]&foo=1',
    )
    expect(out.request!.query_string).toBe('code=[redacted]&state=[redacted]&foo=1')
  })

  it('passes events without a request through untouched', () => {
    const event = { message: 'boom' } as ErrorEvent
    expect(scrubAuthParams(event)).toBe(event)
  })
})
