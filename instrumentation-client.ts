import * as Sentry from '@sentry/nextjs'
import { scrubAuthParams } from '@/lib/observability'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend: scrubAuthParams,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
