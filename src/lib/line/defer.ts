import { after } from 'next/server'
import { reportError } from '@/lib/observability'

/** Keep notification work alive after a successful Route Handler response. */
export function deferLineNotification(task: () => Promise<void>): void {
  after(async () => {
    try {
      await task()
    } catch (error) {
      // The persisted mutation remains successful; the delivery error is observable.
      reportError('line-messaging', error, { fn: 'deferred-notification' })
    }
  })
}
