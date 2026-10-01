import { Suspense } from 'react'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getDiscoveryWorks } from '@/lib/supabase/queries/explore'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { getFavoritedArtistIds } from '@/lib/supabase/queries/favorites'
import { getCurrentUser } from '@/lib/auth/helpers'
import { reportError } from '@/lib/observability'
import { buildLocalizedAlternates } from '@/lib/metadata'
import { ExploreFilters } from '@/components/discovery/ExploreFilters'
import { WorkGrid } from '@/components/discovery/WorkGrid'

type Props = { params: Promise<{locale: string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }
// Discovery and personalized saves must always reflect current approved supply.
export const dynamic = 'force-dynamic'

export async function generateMetadata({params,searchParams}:Props):Promise<Metadata> {
 const {locale}=await params; const sp=await searchParams
 return {title:locale==='en'?'Explore tattoo work':'刺青作品探索｜從喜歡的圖案找到刺青師',description:locale==='en'?'Explore tattoo work by style, subject and location. Contact artists for free.':'按題材、風格與地區探索刺青作品，找到喜歡的刺青師，免費詢價並討論預約。',alternates:buildLocalizedAlternates(locale,'/explore'),robots:Object.keys(sp).length?{index:false,follow:true}:undefined}
}
export default async function ExplorePage({params,searchParams}:Props) {
 const {locale}=await params; setRequestLocale(locale); const en=locale==='en'; const sp=await searchParams
 const [result,styles,user]=await Promise.all([getDiscoveryWorks(sp),getAllStyles(),getCurrentUser().catch(error => { reportError('public-viewer', error); return null })])
 const saved=user?await getFavoritedArtistIds(user.lineUserId,result.works.map(w=>w.artists.id)):new Set<string>()
 const pageLink=(page:number)=>{const q=new URLSearchParams();for(const [k,v] of Object.entries(sp))if(typeof v==='string')q.set(k,v);q.set('page',String(page));return `/explore?${q}`}
 return <div className="v2-container py-10 lg:py-14">
   <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{en?'Find something that feels like you.':'從一點喜歡開始。'}</h1><p className="mt-3 text-muted-foreground">{en?'Browse real work, meet the artist, and talk about your idea.':'看看作品，認識創作者。喜歡的話，就從聊聊想法開始。'}</p></div><Link href="/guide" className="text-sm text-primary underline underline-offset-4">{en?'Not sure where to start?':'還不知道自己喜歡什麼？'}</Link></div>
   <Suspense><ExploreFilters styles={styles} en={en}/></Suspense>
   <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">{en?`${result.total} works`:`${result.total} 件作品`}</p>
   {result.works.length?<WorkGrid works={result.works} saved={saved} en={en}/>:<div className="rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center"><h2 className="text-xl font-semibold">{result.unavailable?(en?'Work is temporarily unavailable':'作品暫時無法載入'):(en?'No work matches yet':'目前還沒有符合的作品')}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">{result.unavailable?(en?'Please try again shortly.':'請稍後重新整理，再試一次。'):(en?'Try another subject or explore all artists. We are welcoming artists and their original work.':'可以換個題材、放寬地區，或先認識刺青師。我們也持續歡迎創作者分享作品。')}</p><Link href="/explore" className="v2-button secondary mt-6">{en?'Reset filters':'清除篩選'}</Link><Link href="/artists" className="ml-5 text-sm underline">{en?'View artists':'瀏覽刺青師'}</Link></div>}
   {result.total>24&&<nav className="mt-10 flex items-center justify-center gap-6" aria-label={en?'Pagination':'分頁'}>{result.page>1&&<Link className="v2-button secondary" href={pageLink(result.page-1)}>{en?'Previous':'上一頁'}</Link>}<span>{result.page} / {Math.ceil(result.total/24)}</span>{result.page*24<result.total&&<Link className="v2-button secondary" href={pageLink(result.page+1)}>{en?'Next':'下一頁'}</Link>}</nav>}
 </div>
}
