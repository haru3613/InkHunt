import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

interface StyleCardProps {
  readonly style: StyleRow
  readonly artistCount: number
  readonly artistsLabel: string
}

function StyleCard({ style, artistCount, artistsLabel }: StyleCardProps) {
  return (
    <Link
      href={`/styles/${style.slug}`}
      className="rounded-none border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
    >
      <span className="text-2xl" role="img" aria-label={style.name}>
        {style.icon}
      </span>
      <p className="mt-2 font-medium text-foreground">{style.name}</p>
      <p className="text-sm text-muted-foreground">{artistCount} {artistsLabel}</p>
    </Link>
  )
}

interface StyleGridProps {
  readonly styles: readonly StyleRow[]
  readonly artistCounts: ReadonlyMap<string, number>
}

export async function StyleGrid({ styles, artistCounts }: StyleGridProps) {
  const t = await getTranslations('common')

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          artistCount={artistCounts.get(style.slug) ?? 0}
          artistsLabel={t('artists')}
        />
      ))}
    </div>
  )
}
