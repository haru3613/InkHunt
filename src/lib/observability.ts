import * as Sentry from '@sentry/nextjs'

/**
 * Single funnel for errors we deliberately do not propagate (HAR-662).
 * Logs to console (Vercel function logs) and forwards to Sentry tagged
 * by scope. Must never throw — reporting can't take down the caller.
 */
export function reportError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  console.error(`[${scope}]`, err, extra ?? '')
  try {
    Sentry.captureException(err, { tags: { scope }, extra })
  } catch {
    // Sentry unavailable/misconfigured — console.error above still fired.
  }
}
