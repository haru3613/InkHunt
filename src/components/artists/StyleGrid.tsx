import Link from 'next/link'
import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

interface StyleCardProps {
  readonly style: StyleRow
  readonly artistCount: number
}

function StyleCard({ style, artistCount }: StyleCardProps) {
  return (
    <Link
      href={`/styles/${style.slug}`}
      className="rounded-xl border border-stone-200 bg-white p-4 transition hover:shadow-md"
    >
      <span className="text-2xl" role="img" aria-label={style.name}>
        {style.icon}
      </span>
      <p className="mt-2 font-medium text-stone-900">{style.name}</p>
      <p className="text-sm text-stone-500">{artistCount} 位刺青師</p>
    </Link>
  )
}

interface StyleGridProps {
  readonly styles: readonly StyleRow[]
  readonly artistCounts: ReadonlyMap<string, number>
}

export function StyleGrid({ styles, artistCounts }: StyleGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          artistCount={artistCounts.get(style.slug) ?? 0}
        />
      ))}
    </div>
  )
}
