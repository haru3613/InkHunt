import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

import { reportError } from '../observability'

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
