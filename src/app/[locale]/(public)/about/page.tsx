import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  return { title: t('title') }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground">{t('title')}</h1>

      <section className="mt-8 space-y-4 text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">{t('missionTitle')}</h2>
        <p>{t('missionBody')}</p>
      </section>

      <section className="mt-8 space-y-4 text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">{t('whyTitle')}</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{t('why1')}</li>
          <li>{t('why2')}</li>
          <li>{t('why3')}</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4 text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">{t('contactTitle')}</h2>
        <p>{t('contactBody')}</p>
      </section>
    </div>
  )
}
