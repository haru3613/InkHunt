import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { DiscoveryGuide } from '@/components/discovery/DiscoveryGuide'
import { buildLocalizedAlternates } from '@/lib/metadata'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;return{title:locale==='en'?'Your first tattoo: find a direction':'第一次刺青｜找到喜歡的題材與方向',description:locale==='en'?'Explore tattoo ideas and find an artist. Free, step by step.':'不知道自己喜歡什麼風格？從題材與地區開始，整理刺青想法，免費找到適合你的刺青師。',alternates:buildLocalizedAlternates(locale,'/guide')}}
export default async function GuidePage({params}:{params:Promise<{locale:string}>}){const{locale}=await params;setRequestLocale(locale);return <DiscoveryGuide/>}
