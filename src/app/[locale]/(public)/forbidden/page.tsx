import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

interface ForbiddenPageProps {
  readonly params: Promise<{ locale: string }>
}

export default async function ForbiddenPage({ params }: ForbiddenPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('forbidden')

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-sm font-medium tracking-wide text-primary">
        403
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
        {t('title')}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('description')}</p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink-accent-hover"
      >
        {t('backHome')}
      </Link>
    </main>
  )
}
