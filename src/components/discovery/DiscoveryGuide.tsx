'use client'
import { useState } from 'react'
import { useLocale } from 'next-intl'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { CITIES, SUBJECTS } from '@/lib/discovery/catalog'

export function DiscoveryGuide() {
 const en=useLocale()==='en'
 const [step,setStep]=useState(0),[subject,setSubject]=useState(''),[city,setCity]=useState('')
 const query=new URLSearchParams();if(subject)query.set('subject',subject);if(city)query.set('city',city)
 const selected=SUBJECTS.find(x=>x.value===subject)
 return <div className="mx-auto max-w-2xl px-5 py-12 lg:py-20">
  <Link href="/explore" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16}/>{en?'Back to exploration':'回到作品探索'}</Link>
  <h1 className="text-3xl font-bold leading-snug tracking-tight">{en?'You do not need to know the style name.':'不知道風格名稱，也沒關係。'}</h1><p className="mt-4 leading-7 text-muted-foreground">{en?'Start with a subject you like. This helps narrow your search — the final design is a conversation with your artist.':'先從喜歡的題材開始。這裡幫你縮小方向，真正的設計可以再和刺青師一起討論。'}</p>
  <ol className="my-9 flex items-center gap-3" aria-label={en?'Progress':'探索進度'}>{(en?['Inspiration','Location','Your direction']:['喜歡什麼','在哪裡','你的方向']).map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={`flex flex-1 items-center gap-2 border-b-2 pb-3 text-sm ${i<=step?'border-primary text-primary':'border-border text-muted-foreground'}`}><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{i<step?<Check size={13}/>:i+1}</span>{label}</li>)}</ol>
  <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
   {step===0&&<fieldset><legend className="mb-5 text-xl font-semibold">{en?'What are you drawn to?':'什麼樣的圖案，會讓你多看一眼？'}</legend><div className="grid grid-cols-2 gap-3">{[...SUBJECTS,{value:'',zh:'還不確定，都看看',en:'Still open to ideas',words:[]}].map(item=><button key={item.value} aria-pressed={subject===item.value} onClick={()=>setSubject(item.value)} className={`min-h-16 rounded-lg border px-4 text-left text-sm ${subject===item.value?'border-primary bg-accent font-medium text-primary':'border-border hover:bg-muted'}`}>{en?item.en:item.zh}</button>)}</div><p className="mt-5 text-xs leading-6 text-muted-foreground">{en?'You can always change your mind.':'沒有標準答案，之後隨時可以換個方向。'}</p></fieldset>}
   {step===1&&<div><label htmlFor="guide-city" className="mb-5 block text-xl font-semibold">{en?'Where would you like to go?':'你希望在哪裡找到刺青師？'}</label><select id="guide-city" className="v2-select w-full" value={city} onChange={e=>setCity(e.target.value)}><option value="">{en?'Anywhere in Taiwan':'地區不限，全台灣都看看'}</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select><p className="mt-5 text-sm leading-7 text-muted-foreground">{en?'Larger pieces may require several visits. Think about travel and follow-up appointments too.':'較大的作品可能需要分次完成，也可以把交通與回訪的方便程度一起考慮。'}</p></div>}
   {step===2&&<div><h2 className="text-xl font-semibold">{en?'A starting point, just for you.':'先從這個方向，慢慢找。'}</h2><dl className="mt-6 space-y-4"><div className="flex justify-between border-b border-border pb-3"><dt className="text-muted-foreground">{en?'Subject':'題材'}</dt><dd>{selected?(en?selected.en:selected.zh):(en?'Open to ideas':'不限題材')}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{en?'Region':'地區'}</dt><dd>{city||(en?'All Taiwan':'全台灣')}</dd></div></dl><p className="mt-6 text-sm leading-7 text-muted-foreground">{en?'Save artists whose work you like. When you are ready, tell them your idea, placement, approximate size and budget. Asking is free.':'看到喜歡的作品，可以先收藏刺青師。準備好時，再告訴對方你的想法、部位、大約大小與預算，詢問完全免費。'}</p></div>}
  </div>
  <div className="mt-6 flex justify-between gap-4">{step>0?<button onClick={()=>setStep(step-1)} className="v2-button secondary"><ArrowLeft size={16}/>{en?'Back':'上一步'}</button>:<span/>}{step<2?<button onClick={()=>setStep(step+1)} className="v2-button">{en?'Next':'下一步'}<ArrowRight size={16}/></button>:<Link href={`/explore?${query}`} className="v2-button">{en?'Explore matching work':'看看這些作品'}<ArrowRight size={16}/></Link>}</div>
 </div>
}
