import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StyleBadgeProps {
  name: string
  icon?: string | null
  slug?: string
  active?: boolean
}

export function StyleBadge({ name, icon, active = false }: StyleBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-stone-200 text-stone-700 hover:bg-stone-300',
        active && 'bg-amber-500 text-white hover:bg-amber-600',
      )}
    >
      {icon && <span>{icon}</span>}
      {name}
    </Badge>
  )
}
