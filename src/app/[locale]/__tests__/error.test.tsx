import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// HAR-663: branded zh-TW/en error boundary replacing Next's default English
// error screen. useTranslations mocked key->key per the repo's Footer.test.tsx
// pattern (no NextIntlClientProvider needed for a unit render).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const mockReportError = vi.fn()
vi.mock('@/lib/observability', () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={typeof href === 'string' ? href : '/'} {...props}>
      {children}
    </a>
  ),
}))

describe('LocaleError (src/app/[locale]/error.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the branded title/description copy instead of the Next.js default screen', async () => {
    const { default: LocaleError } = await import('../error')
    render(
      <LocaleError
        error={new Error('boom')}
        reset={vi.fn()}
        unstable_retry={vi.fn()}
      />
    )

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('description')).toBeInTheDocument()
  })

  it('calls unstable_retry() (re-fetches + resets, not a bare reset()) when the retry button is clicked', async () => {
    // Next 16.2's `reset()` only clears the boundary's local error state — it
    // does NOT re-fetch server data, so it silently no-ops when the failure
    // was a Server Component data-fetch error (the common case). Next's own
    // docs (node_modules/next/dist/docs/.../error.md) say to prefer
    // `unstable_retry()`, which calls `router.refresh()` before `reset()`.
    const { default: LocaleError } = await import('../error')
    const reset = vi.fn()
    const unstableRetry = vi.fn()
    render(
      <LocaleError
        error={new Error('boom')}
        reset={reset}
        unstable_retry={unstableRetry}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(unstableRetry).toHaveBeenCalledTimes(1)
    expect(reset).not.toHaveBeenCalled()
  })

  it('offers a link back home', async () => {
    const { default: LocaleError } = await import('../error')
    render(
      <LocaleError
        error={new Error('boom')}
        reset={vi.fn()}
        unstable_retry={vi.fn()}
      />
    )

    const homeLink = screen.getByRole('link', { name: 'goHome' })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('reports the error to the error tracker (HAR-662)', async () => {
    const { default: LocaleError } = await import('../error')
    const error = new Error('boom')
    render(
      <LocaleError error={error} reset={vi.fn()} unstable_retry={vi.fn()} />
    )

    expect(mockReportError).toHaveBeenCalledWith('error-boundary', error)
  })
})
