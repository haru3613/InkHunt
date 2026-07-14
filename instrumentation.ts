import * as Sentry from '@sentry/nextjs'
import { assertServerEnv } from '@/lib/env'

export function register() {
  assertServerEnv()
  // ponytail: init inline for both node/edge runtimes; split into
  // sentry.server/edge.config.ts only if runtime-specific options appear.
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Strip OAuth code/state (LINE callback) from captured request URLs.
    beforeSend(event) {
      const req = event.request
      if (req?.url) req.url = req.url.replace(/\b(code|state)=[^&#]*/g, '$1=[redacted]')
      if (typeof req?.query_string === 'string') {
        req.query_string = req.query_string.replace(/\b(code|state)=[^&#]*/g, '$1=[redacted]')
      }
      return event
    },
  })
}

export const onRequestError = Sentry.captureRequestError
