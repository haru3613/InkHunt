import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// HAR-663: last-resort boundary for a failure in the ROOT layout itself
// (locale never resolves, so no next-intl provider is available — copy is
// hardcoded bilingual, not translated).
describe('GlobalError (src/app/global-error.tsx)', () => {
  it('renders bilingual branded copy instead of the Next.js default screen', async () => {
    const { default: GlobalError } = await import('../global-error')
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)

    expect(screen.getByText(/發生錯誤/)).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
  })

  it('calls reset() when the retry button is clicked', async () => {
    const { default: GlobalError } = await import('../global-error')
    const reset = vi.fn()
    render(<GlobalError error={new Error('boom')} reset={reset} />)

    fireEvent.click(screen.getByRole('button'))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('logs the error for the (future) error tracker hook point', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: GlobalError } = await import('../global-error')
    const error = new Error('boom')
    render(<GlobalError error={error} reset={vi.fn()} />)

    expect(spy).toHaveBeenCalledWith('[global-error-boundary]', error)
  })
})
