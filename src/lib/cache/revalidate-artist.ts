import { revalidatePath } from 'next/cache'
import { routing } from '@/i18n/routing'

/**
 * Revalidates the public artist detail page (every locale) after a mutation
 * that changes what the public sees for this artist — admin status flip
 * (approve/suspend), a profile edit, or a portfolio change (HAR-664).
 *
 * The page also sets a time-based `revalidate` (ISR) as a safety net for any
 * mutation path that forgets to call this.
 */
export function revalidateArtistPage(slug: string): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/artists/${slug}`)
  }
}
