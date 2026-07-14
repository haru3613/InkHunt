import * as Sentry from '@sentry/nextjs'

const OAUTH_PARAMS = /\b(code|state)=[^&#]*/g

/**
 * Sentry `beforeSend` hook shared by instrumentation.ts and
 * instrumentation-client.ts: strips OAuth code/state (LINE callback)
 * from captured request URLs.
 */
export function scrubAuthParams<E extends Sentry.ErrorEvent>(event: E): E {
  const req = event.request
  if (req?.url) req.url = req.url.replace(OAUTH_PARAMS, '$1=[redacted]')
  if (typeof req?.query_string === 'string') {
    req.query_string = req.query_string.replace(OAUTH_PARAMS, '$1=[redacted]')
  }
  return event
}

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
