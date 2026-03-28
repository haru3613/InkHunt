import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })
  return { title: t('title') }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('terms')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated')}</p>

      <div className="mt-8 space-y-8 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('acceptTitle')}</h2>
          <p className="mt-2">{t('acceptBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('serviceTitle')}</h2>
          <p className="mt-2">{t('serviceBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('accountTitle')}</h2>
          <p className="mt-2">{t('accountBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('contentTitle')}</h2>
          <p className="mt-2">{t('contentBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('prohibitedTitle')}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>{t('prohibited1')}</li>
            <li>{t('prohibited2')}</li>
            <li>{t('prohibited3')}</li>
            <li>{t('prohibited4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('disclaimerTitle')}</h2>
          <p className="mt-2">{t('disclaimerBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('changeTitle')}</h2>
          <p className="mt-2">{t('changeBody')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">{t('contactTitle')}</h2>
          <p className="mt-2">{t('contactBody')}</p>
        </section>
      </div>
    </div>
  )
}
