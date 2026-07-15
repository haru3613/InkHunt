import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

/**
 * Landing block when the marketplace has no active artists yet (cold start).
 * Keeps the gallery mood without dumping "0 位刺青師" rows.
 */
export async function ColdStartInvite() {
  const t = await getTranslations('home')

  return (
    <section
      data-testid="cold-start-invite"
      className="border-b border-border py-16 lg:py-24"
    >
      <div className="container mx-auto max-w-2xl px-4 text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-primary">
          {t('coldStartLabel')}
        </p>
        <h2 className="font-display mt-3 text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight text-foreground">
          {t('coldStartTitle')}
        </h2>
        <p className="mt-4 text-base text-muted-foreground">{t('coldStartBody')}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/artist"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-8 text-sm font-medium text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-accent-hover"
          >
            {t('coldStartCtaArtist')}
          </Link>
          <Link
            href="/artists"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-border px-8 text-sm font-medium text-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted"
          >
            {t('coldStartCtaBrowse')}
          </Link>
        </div>
      </div>
    </section>
  )
}
