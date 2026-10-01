import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { AuthSection } from './AuthSection'

export async function Header() {
  const en = (await getLocale()) === 'en'
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:bg-card focus:p-3">{en ? 'Skip to content' : '跳到主要內容'}</a>
      <div className="v2-container flex h-[72px] items-center gap-10">
        <Link href="/" aria-label="InkHunt" className="v2-wordmark text-[32px] leading-none">InkHunt<span className="text-primary">.</span></Link>
        <nav aria-label={en ? 'Main navigation' : '主要導覽'} className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link href="/explore" className="hover:text-primary">{en ? 'Explore work' : '探索作品'}</Link>
          <Link href="/artists" className="hover:text-primary">{en ? 'Find an artist' : '找刺青師'}</Link>
          <Link href="/favorites" className="hover:text-primary">{en ? 'Saved artists' : '我的收藏'}</Link>
          <Link href="/inquiries" className="hover:text-primary">{en ? 'My inquiries' : '我的詢價'}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/artist" className="hidden rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-muted sm:block">{en ? 'For artists · Free' : '刺青師入駐 · 免費'}</Link>
          <AuthSection loginLabel={en ? 'Log in' : '登入'} />
        </div>
      </div>
    </header>
  )
}
