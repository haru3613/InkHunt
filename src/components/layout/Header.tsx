import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { AuthSection } from './AuthSection'

export async function Header() {
  const t = await getTranslations('nav')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <span className="font-display text-xl font-bold text-primary">
            InkHunt
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/artist"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('becomeArtist')}
          </Link>
          <AuthSection loginLabel={t('login')} />
        </div>
      </div>
    </header>
  )
}
