import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('title') }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('privacy')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}</p>

      <div className="mt-8 space-y-8 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('collectTitle')}</h2>
          <p className="mt-2">{t('collectBody')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>{t('collect1')}</li>
            <li>{t('collect2')}</li>
            <li>{t('collect3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('useTitle')}</h2>
          <p className="mt-2">{t('useBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('shareTitle')}</h2>
          <p className="mt-2">{t('shareBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('cookieTitle')}</h2>
          <p className="mt-2">{t('cookieBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('rightsTitle')}</h2>
          <p className="mt-2">{t('rightsBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('contactTitle')}</h2>
          <p className="mt-2">{t('contactBody')}</p>
        </section>
      </div>
    </div>
  )
}
