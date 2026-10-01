import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { FavoriteButton } from '@/components/artists/FavoriteButton'
import type { DiscoveryWork } from '@/lib/supabase/queries/explore'

export function WorkGrid({ works, saved = new Set<string>(), en = false }: { works: DiscoveryWork[]; saved?: Set<string>; en?: boolean }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
    {works.map(work => <article key={work.id} className="group min-w-0">
      <div className="relative">
        <Link href={`/artists/${work.artists.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          <Image src={work.image_url} alt={work.title || work.description || (en ? `${work.artists.display_name}'s tattoo` : `${work.artists.display_name} 的刺青作品`)} fill sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 23vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]" />
        </Link>
        <div className="absolute right-2 top-2 rounded-full bg-background/95 shadow-sm"><FavoriteButton artistId={work.artists.id} initialFavorited={saved.has(work.artists.id)} /></div>
      </div>
      <p className="mt-3 truncate text-xs text-muted-foreground">{(en ? work.styles?.name_en : work.styles?.name) || (en ? 'Tattoo work' : '刺青作品')}<span className="mx-2">·</span>{work.artists.city}</p>
      <Link href={`/artists/${work.artists.slug}`} className="mt-2 flex min-h-10 items-center justify-between gap-2 text-sm font-medium"><span className="truncate">{work.artists.display_name}</span><ArrowUpRight size={17} className="shrink-0 text-muted-foreground" /></Link>
    </article>)}
  </div>
}
