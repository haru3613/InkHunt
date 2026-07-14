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
  })
}

export const onRequestError = Sentry.captureRequestError
