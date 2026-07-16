import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockReportError = vi.fn()
vi.mock('@/lib/observability', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}))

// HAR-663: last-resort boundary for a failure in the ROOT layout itself
// (locale never resolves, so no next-intl provider is available — copy is
// hardcoded bilingual, not translated).
describe('GlobalError (src/app/global-error.tsx)', () => {
  it('renders bilingual branded copy instead of the Next.js default screen', async () => {
    const { default: GlobalError } = await import('../global-error')
    render(
      <GlobalError
        error={new Error('boom')}
        reset={vi.fn()}
        unstable_retry={vi.fn()}
      />
    )

    expect(screen.getByText(/發生錯誤/)).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })

  it('calls unstable_retry() (re-fetches + resets, not a bare reset()) when the retry button is clicked', async () => {
    // Same rationale as the locale error.tsx test: bare reset() only clears
    // local boundary state and does NOT re-fetch, so it can silently no-op
    // on the exact class of error (root data-fetch failure) this file exists
    // to recover from.
    const { default: GlobalError } = await import('../global-error')
    const reset = vi.fn()
    const unstableRetry = vi.fn()
    render(
      <GlobalError
        error={new Error('boom')}
        reset={reset}
        unstable_retry={unstableRetry}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(unstableRetry).toHaveBeenCalledTimes(1)
    expect(reset).not.toHaveBeenCalled()
  })

  it('reports the error to the error tracker (HAR-662)', async () => {
    const { default: GlobalError } = await import('../global-error')
    const error = new Error('boom')
    render(
      <GlobalError error={error} reset={vi.fn()} unstable_retry={vi.fn()} />
    )

    expect(mockReportError).toHaveBeenCalledWith('global-error-boundary', error)
  })
})
