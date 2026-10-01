import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { diverseWorks } from '@/lib/discovery/catalog'
import { getDiscoveryWorks } from '@/lib/supabase/queries/explore'
import { getCurrentUser } from '@/lib/auth/helpers'
import { reportError } from '@/lib/observability'
import { getFavoritedArtistIds } from '@/lib/supabase/queries/favorites'
import { ExploreFilters } from '@/components/discovery/ExploreFilters'
import { WorkGrid } from '@/components/discovery/WorkGrid'
import { JsonLd } from '@/components/shared/JsonLd'
import { generateWebsiteJsonLd } from '@/lib/seo'
import { buildLocalizedAlternates } from '@/lib/metadata'

// Discovery and personalized saves must always reflect current approved supply.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
 const { locale } = await params
 return { alternates: buildLocalizedAlternates(locale, '') }
}
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params; setRequestLocale(locale); const en = locale === 'en'
 const [styles,result,user] = await Promise.all([getAllStyles(),getDiscoveryWorks({},48),getCurrentUser().catch(error => { reportError('public-viewer', error); return null })])
 const works=diverseWorks(result.works,4)
 const saved=user?await getFavoritedArtistIds(user.lineUserId,works.map(w=>w.artists.id)):new Set<string>()
 return <>
  <JsonLd data={generateWebsiteJsonLd()} />
  <section className="relative isolate overflow-hidden border-b border-border">
   <div className="v2-container grid items-center lg:min-h-[380px] lg:grid-cols-2">
    <div className="relative z-10 py-12 lg:py-12">
     <h1 className="max-w-2xl text-[clamp(2.1rem,3.5vw,3.6rem)] font-bold leading-[1.3] tracking-[-0.045em]">{en?<>Find your next tattoo.<br/>And your kind of artist.</>:<>找到想留在身上的，<br/>也找到懂你的。</>}</h1>
     <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground lg:text-lg">{en?'Start with work you love. Find an artist who understands your idea.':'從喜歡的作品開始，慢慢找到適合你的刺青師。'}</p>
     <div className="mt-8 flex flex-wrap gap-3"><Link href="/explore" className="v2-button">{en?'Explore work':'探索作品'}<ArrowRight size={18}/></Link><Link href="/guide" className="v2-button secondary">{en?'Help me find a direction':'還沒想法？幫我找方向'}</Link></div>
    </div>
    <figure className="relative -mx-4 h-64 overflow-hidden sm:mx-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[47%] lg:h-full">
     <Image src="/images/v2/botanical-editorial.jpg" alt={en?'Botanical tattoo inspiration, AI-generated editorial image':'植物線條刺青靈感，AI 生成情境示意圖'} fill priority sizes="(min-width:1024px) 47vw,100vw" className="object-cover object-center"/>
     <figcaption className="absolute bottom-4 right-4 rounded bg-background/90 px-3 py-1.5 text-[11px] text-foreground">{en?'Editorial inspiration · AI-generated':'刺青靈感示意 · AI 生成'}</figcaption>
    </figure>
   </div>
  </section>
  <section className="v2-container py-10 lg:py-12" id="work">
   <h2 className="mb-5 text-2xl font-bold tracking-tight lg:text-3xl">{en?'A little inspiration goes a long way.':'從一點喜歡開始'}</h2>
   <Suspense><ExploreFilters styles={styles} en={en} home/></Suspense>
   {works.length?<WorkGrid works={works} saved={saved} en={en}/>:<div className="grid gap-6 rounded-lg border border-border bg-card p-8 md:grid-cols-[1fr_auto] md:items-center"><div><h3 className="text-xl font-semibold">{en?'Make room for original work.':'好的作品，值得被看見。'}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{result.unavailable?(en?'We could not load the gallery. Please try again shortly.':'作品暫時無法載入，請稍後再試。'):(en?'We are inviting tattoo artists to share their work. Explore styles while the gallery grows.':'我們正在邀請刺青師分享作品。你可以先探索喜歡的風格，也歡迎成為這裡的第一批創作者。')}</p></div><Link href="/artist" className="v2-button secondary">{en?'Join as an artist':'免費建立作品集'}<ArrowUpRight size={18}/></Link></div>}
   <div className="mt-9 text-center"><Link href="/explore" className="v2-button secondary min-w-60">{en?'Explore all work':'看更多作品'}<ArrowRight size={18}/></Link></div>
  </section>
  <section className="border-y border-border bg-[#ECEEE7] py-12 lg:py-16">
   <div className="v2-container grid gap-8 lg:grid-cols-[1fr_1.2fr]"><div><h2 className="text-2xl font-bold lg:text-3xl">{en?'Your first tattoo starts with a conversation.':'第一次刺青，從好好聊聊開始。'}</h2><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">{en?'There is no rush to decide. Save your favorites, share your ideas, and confirm the details with your artist.':'不用急著決定。先收藏喜歡的創作者，再帶著你的想法，和刺青師一起確認細節。'}</p><Link href="/guide" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">{en?'Start with a few simple questions':'用幾個問題，整理你的想法'}<ArrowRight size={17}/></Link></div><ol className="grid gap-6 sm:grid-cols-3">{(en?[['Explore','Find a style and artist you connect with.'],['Talk','Share your idea, placement and budget for free.'],['Confirm','Agree on the design, date and payment directly.']]:[['找到喜歡','看作品、了解風格，收藏適合你的刺青師。'],['聊聊想法','提供圖案、部位與預算，免費詢問。'],['確認預約','和刺青師確認設計、時間、地點與付款方式。']]).map(([title,body],i)=><li key={title} className="border-t border-[#C6CCBF] pt-4"><span className="font-display text-sm text-primary">0{i+1}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p></li>)}</ol></div>
  </section>
  <section className="v2-container flex flex-col justify-between gap-6 py-12 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">{en?'Let your work introduce you.':'讓你的作品，替你介紹自己。'}</h2><p className="mt-3 text-sm text-muted-foreground">{en?'Free for artists and clients. No commission, ever.':'刺青師與使用者都免費，沒有抽成。'}</p></div><Link href="/artist" className="v2-button">{en?'Create your artist page':'建立你的刺青師頁面'}<ArrowUpRight size={18}/></Link></section>
 </>
}
