'use client'
import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'
import { RejectedScreen } from '@/components/onboarding/RejectedScreen'
import { ArrowRight, Check } from 'lucide-react'

export default function ArtistEntryPage() {
 const {isLoading,isLoggedIn,artist,loginWithRedirect}=useAuth();const router=useRouter();const locale=useLocale();const en=locale==='en'
 useEffect(()=>{if(isLoading||!isLoggedIn)return;if(!artist)router.replace('/artist/onboarding');else if(artist.status==='active')router.replace('/artist/dashboard')},[isLoading,isLoggedIn,artist,router])
 if(isLoading||(isLoggedIn&&(!artist||artist.status==='active')))return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground" role="status">{en?'Loading your workspace…':'正在準備你的工作室…'}</div>
 if(artist?.status==='suspended')return <RejectedScreen/>
 if(artist?.status==='pending')return <div className="mx-auto max-w-xl px-6 py-24 text-center"><Check className="mx-auto mb-6 size-12 rounded-full bg-accent p-3 text-primary"/><h1 className="text-3xl font-semibold">{en?'Your application is under review.':'你的入駐申請，正在審核中。'}</h1><p className="mt-5 leading-8 text-muted-foreground">{en?'We will check your profile and portfolio before publishing. You can return here to check your application.':'我們會確認你的個人資料與作品，通過審核後，頁面才會公開接受詢問。目前尚無固定審核時程，你可以隨時回來查看進度。'}</p><Link href="/" className="v2-button secondary mt-8">{en?'Explore InkHunt':'先逛逛 InkHunt'}</Link></div>
 return <div className="v2-container py-12 lg:py-20">
  <div className="mx-auto max-w-3xl text-center"><h1 className="text-4xl font-bold leading-[1.3] tracking-tight lg:text-5xl">{en?<>Your art deserves<br/>to be discovered.</>:<>讓懂你作品的人，<br/>找到你。</>}</h1><p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{en?'A home for your portfolio and a place to meet future clients. Free to join, free to use, no commission.':'免費建立你的作品頁，讓客人透過搜尋認識你。入駐免費、詢價免費，成交也不抽成。'}</p><button onClick={()=>loginWithRedirect(`/${locale}/artist`)} className="v2-button mt-8">{en?'Start with LINE':'使用 LINE 免費開始'}<ArrowRight size={18}/></button><p className="mt-4 text-xs text-muted-foreground">{en?'You own your work, pricing and client relationships.':'作品、定價與客戶關係，都由你自己掌握。'}</p></div>
  <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">{(en?[['Your own portfolio','Show your style, healed work, location and reference prices in one shareable page.'],['Better conversations','Clients share their idea, placement, size and budget before you reply.'],['Your way of working','Discuss design and dates directly. Use the payment method you normally use.']]:[['一頁介紹你的風格','展示作品、恢復照、服務地區與參考價格，分享連結就能完整介紹自己。'],['從完整的想法開始','客人先整理題材、部位、大小與預算，你再依需求回覆與報價。'],['保留你的工作方式','設計與預約時間由你確認，付款沿用你習慣的方式，平台不介入抽成。']]).map(([title,description],i)=><section key={title} className="border-t border-border pt-6"><span className="text-sm text-primary">0{i+1}</span><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p></section>)}</div>
  <div className="mx-auto mt-14 max-w-5xl rounded-xl border border-border bg-card p-8"><h2 className="text-lg font-semibold">{en?'How to join':'怎麼開始？'}</h2><p className="mt-3 leading-8 text-muted-foreground">{en?'Sign in with LINE → fill in your profile → upload your own work → submit for review → welcome your first inquiry.':'LINE 登入 → 填寫個人資料 → 上傳你自己的作品 → 送出審核 → 開始接收詢問。'}</p><p className="mt-3 text-sm text-muted-foreground">{en?'Upload only work you created or have permission to publish.':'請上傳你創作或已取得公開授權的作品。'}</p></div>
 </div>
}
