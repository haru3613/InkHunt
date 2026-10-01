import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { ArtistWithDetails } from '@/lib/supabase/queries/artists'
import { ArtistAvatar } from './ArtistAvatar'
import { StyleBadge } from './StyleBadge'
import { PriceRange } from './PriceRange'
import { FavoriteButton } from './FavoriteButton'
import { StarRating } from '@/components/shared/StarRating'
import { isNewArtist } from '@/lib/artists/new-artist'

interface ArtistCardProps { readonly artist: ArtistWithDetails; readonly variant?: 'default' | 'compact'; readonly initialFavorited?: boolean }
export async function ArtistCard({ artist, variant = 'default', initialFavorited = false }: ArtistCardProps) {
 const t=await getTranslations('artists');const cover=artist.portfolio_items[0];const summary=artist.reviewSummary
 return <article className={`group relative overflow-hidden rounded-xl border border-border bg-card ${variant==='compact'?'min-w-64':''}`}>
  <Link href={`/artists/${artist.slug}`} className="block">
   <div className="relative aspect-[4/3] overflow-hidden bg-muted">
    {cover?<Image src={cover.thumbnail_url??cover.image_url} alt={cover.description??`${artist.display_name} work`} fill sizes="(max-width:640px) 92vw,(max-width:1024px) 45vw,30vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"/>:<div className="flex h-full items-center justify-center"><ArtistAvatar name={artist.display_name} avatarUrl={artist.avatar_url} size="lg"/></div>}
   </div>
   <div className="space-y-3 p-5">
    <div className="flex items-center gap-3"><ArtistAvatar name={artist.display_name} avatarUrl={artist.avatar_url} size="sm"/><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{artist.display_name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12}/>{artist.city}{artist.district?` ${artist.district}`:''}</p></div><ArrowUpRight size={19} className="text-muted-foreground"/></div>
    <div className="flex flex-wrap gap-1.5">{artist.styles.slice(0,3).map(style=><StyleBadge key={style.id} name={style.name}/>)}{artist.styles.length>3&&<span className="text-xs text-muted-foreground">+{artist.styles.length-3}</span>}{artist.offers_coverup&&<span className="text-xs text-primary">{t('badgeCoverup')}</span>}{artist.has_flash_designs&&<span className="text-xs text-primary">{t('badgeFlash')}</span>}</div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><PriceRange min={artist.price_min} max={artist.price_max}/>{isNewArtist(artist.created_at)&&<span className="text-xs text-muted-foreground">{t('newBadge')}</span>}</div>
    {summary&&summary.count>0&&<div className="flex items-center gap-1.5 text-sm text-muted-foreground"><StarRating value={summary.average} size={14} readOnly/><span className="font-medium tabular-nums text-foreground">{summary.average.toFixed(1)}</span><span>({summary.count})</span></div>}
    {artist.savedCount!=null&&artist.savedCount>=3&&<p className="text-xs text-muted-foreground">{t('savedCount',{count:artist.savedCount})}</p>}
   </div>
  </Link>
  <div className="absolute right-3 top-3 rounded-full bg-background/95 shadow-sm"><FavoriteButton artistId={artist.id} initialFavorited={initialFavorited}/></div>
 </article>
}
